//! Descubrimiento del daemon tickmaster en la LAN.
//!
//! El webview no puede abrir sockets UDP, asi que el probe vive en Rust. El
//! protocolo lo define `@mks2508/tickmaster/core`: se emite el texto
//! `TICKMASTER_DISCOVER_V1` por broadcast al udp/9101 y el daemon contesta en
//! unicast con un anuncio JSON.
//!
//! La URL se compone con la IP de origen de la respuesta y no con nada que el
//! anuncio declare: la Raspberry tiene varias direcciones (eth, wifi, tailnet)
//! y solo el enrutado sabe cual alcanza a este equipo.

use serde::{Deserialize, Serialize};

use std::net::{IpAddr, Ipv4Addr, SocketAddr, UdpSocket};
use std::time::{Duration, Instant};

/// Payload exacto del probe; el daemon ignora cualquier otro datagrama.
const PROBE: &[u8] = b"TICKMASTER_DISCOVER_V1";

/// Puerto UDP donde escucha el beacon del daemon.
const DISCOVERY_PORT: u16 = 9101;

/// Version del anuncio que este cliente entiende.
const ANNOUNCE_VERSION: u32 = 1;

const DEFAULT_TIMEOUT_MS: u64 = 1500;

/// Espera antes de recurrir al barrido unicast.
const BROADCAST_GRACE: Duration = Duration::from_millis(300);

/// Anuncio tal y como lo emite el daemon.
#[derive(Deserialize)]
struct Announce {
    v: u32,
    service: String,
    #[serde(default)]
    name: String,
    port: u16,
    #[serde(default)]
    model: String,
}

/// Impresora encontrada en la red.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredPrinter {
    /// URL base del daemon, compuesta con la IP de origen del anuncio.
    pub base_url: String,
    /// Hostname que anuncia el daemon.
    pub name: String,
    /// Modelo de impresora que anuncia el daemon.
    pub model: String,
}

/// Direccion de broadcast de la subred local, asumiendo /24.
///
/// Windows rechaza el broadcast limitado (255.255.255.255) segun la
/// configuracion de la interfaz; el dirigido a la subred si sale. El truco del
/// `connect` a una IP publica no envia ningun paquete en UDP: solo hace que el
/// kernel elija ruta e interfaz para poder leer la IP local.
fn local_ipv4() -> Option<Ipv4Addr> {
    let probe = UdpSocket::bind("0.0.0.0:0").ok()?;
    probe.connect("8.8.8.8:80").ok()?;
    match probe.local_addr().ok()?.ip() {
        IpAddr::V4(v4) => Some(v4),
        IpAddr::V6(_) => None,
    }
}

/// Direccion de broadcast de la subred local, asumiendo /24.
fn subnet_broadcast(local: Ipv4Addr) -> IpAddr {
    let o = local.octets();
    IpAddr::V4(Ipv4Addr::new(o[0], o[1], o[2], 255))
}

/// Manda un probe unicast a cada host del /24 local.
///
/// El broadcast no basta detras de un firewall con estado: el probe sale hacia
/// `255.255.255.255` pero la respuesta llega desde la IP del daemon, y conntrack
/// no empareja las dos, asi que un INPUT deny por defecto (ufw, Windows
/// Firewall) la descarta como trafico no solicitado. Un probe unicast por host
/// si crea la entrada de conntrack que deja pasar su respuesta.
///
/// Son 254 datagramas de 22 bytes, ~2 ms de envio. Los hosts sin beacon
/// devuelven ICMP port unreachable, que el bucle de recepcion ya ignora.
fn sweep_subnet(socket: &UdpSocket, local: Ipv4Addr) {
    let o = local.octets();
    for host in 1..=254u8 {
        if host == o[3] {
            continue;
        }
        let target =
            SocketAddr::new(IpAddr::V4(Ipv4Addr::new(o[0], o[1], o[2], host)), DISCOVERY_PORT);
        let _ = socket.send_to(PROBE, target);
    }
}

/// Emite el probe y espera al primer anuncio valido.
fn probe_network(timeout: Duration) -> Result<DiscoveredPrinter, String> {
    let socket =
        UdpSocket::bind("0.0.0.0:0").map_err(|e| format!("no se pudo abrir el socket UDP: {e}"))?;
    socket
        .set_broadcast(true)
        .map_err(|e| format!("no se pudo habilitar el broadcast: {e}"))?;

    let local = local_ipv4();

    let mut targets = vec![SocketAddr::new(IpAddr::V4(Ipv4Addr::BROADCAST), DISCOVERY_PORT)];
    if let Some(ip) = local {
        targets.push(SocketAddr::new(subnet_broadcast(ip), DISCOVERY_PORT));
    }

    let mut sent = false;
    for target in &targets {
        if socket.send_to(PROBE, target).is_ok() {
            sent = true;
        }
    }
    if !sent && local.is_none() {
        return Err("no se pudo emitir el probe de descubrimiento".to_string());
    }

    let deadline = Instant::now() + timeout;
    // Margen para el broadcast antes de barrer: en una red sin firewall el
    // daemon contesta en un puñado de milisegundos y el barrido nunca se envia.
    let mut sweep_at = Some(Instant::now() + BROADCAST_GRACE);
    let mut buffer = [0u8; 1024];
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            break;
        }

        let wait = match sweep_at {
            Some(at) if at <= Instant::now() => {
                sweep_at = None;
                if let Some(ip) = local {
                    sweep_subnet(&socket, ip);
                }
                remaining
            }
            Some(at) => remaining.min(at.saturating_duration_since(Instant::now())),
            None => remaining,
        };

        if socket
            .set_read_timeout(Some(wait.max(Duration::from_millis(1))))
            .is_err()
        {
            break;
        }

        match socket.recv_from(&mut buffer) {
            Ok((read, source)) => {
                if let Ok(announce) = serde_json::from_slice::<Announce>(&buffer[..read]) {
                    if announce.v == ANNOUNCE_VERSION && announce.service == "tickmaster" {
                        return Ok(DiscoveredPrinter {
                            base_url: format!("http://{}:{}", source.ip(), announce.port),
                            name: announce.name,
                            model: announce.model,
                        });
                    }
                }
            }
            // La Pi con cable y wifi contesta dos veces; si este socket ya
            // cerro, el segundo anuncio vuelve como ICMP unreachable. No es el
            // final de la espera, solo de ese datagrama.
            // Un timeout de lectura no acaba la espera: puede ser el turno del
            // barrido. Quien manda es el deadline, arriba.
            Err(_) => continue,
        }
    }

    Err("ninguna impresora contesto en la red".to_string())
}

/// Busca el daemon tickmaster por broadcast UDP en la red local.
///
/// # Arguments
/// * `timeout_ms` - Espera maxima por una respuesta; 1500 ms por defecto.
#[tauri::command]
pub async fn discover_printer(timeout_ms: Option<u64>) -> Result<DiscoveredPrinter, String> {
    let timeout = Duration::from_millis(timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS));
    tauri::async_runtime::spawn_blocking(move || probe_network(timeout))
        .await
        .map_err(|e| format!("el descubrimiento no pudo ejecutarse: {e}"))?
}
