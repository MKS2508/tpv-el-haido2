/**
 * AEAT Certificate Utilities
 *
 * Utilidades para gestión de certificados digitales para AEAT VERI*FACTU.
 * En producción, los certificados se configuran en el servidor AEAT Bridge.
 *
 * Este módulo proporciona:
 * - Validación de formato de certificados
 * - Información sobre tipos de certificados
 * - Helpers para la configuración
 */

import { err, ok, type Result } from '@mks2508/no-throw';
import { AEATErrorCode, type AEATResultError } from '@/lib/error-codes';
import type { AEATCertificateConfig, AEATCertificateType } from '@/models/AEAT';

// ==================== Types ====================

export interface CertificateInfo {
  type: AEATCertificateType;
  format: 'pfx' | 'pem';
  isConfigured: boolean;
  description: string;
}

// ==================== Constants ====================

/**
 * Endpoints según tipo de certificado
 */
export const AEAT_ENDPOINTS = {
  test: {
    personal: 'https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
    sello: 'https://prewww10.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
  },
  production: {
    personal:
      'https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
    sello:
      'https://www10.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
  },
} as const;

/**
 * Descripciones de tipos de certificado
 */
export const CERTIFICATE_DESCRIPTIONS: Record<AEATCertificateType, string> = {
  personal:
    'Certificado de persona física o representante legal. Requiere intervención manual para operaciones.',
  sello:
    'Certificado de sello electrónico para aplicaciones automatizadas. Ideal para sistemas de facturación.',
};

// ==================== Validation ====================

/**
 * Valida la configuración de certificado
 */
export function validateCertificateConfig(
  config: AEATCertificateConfig
): Result<boolean, AEATResultError> {
  // Verificar que hay al menos una opción configurada
  const hasPfx = config.pfxPath && config.pfxPassword;
  const hasPem = config.certPath && config.keyPath;

  if (!hasPfx && !hasPem) {
    return err({
      code: AEATErrorCode.CertificateNotFound,
      message: 'No se ha configurado ningún certificado. Proporcione PFX o PEM.',
    });
  }

  // Verificar extensiones
  if (hasPfx) {
    if (
      !config.pfxPath?.toLowerCase().endsWith('.pfx') &&
      !config.pfxPath?.toLowerCase().endsWith('.p12')
    ) {
      return err({
        code: AEATErrorCode.CertificateInvalid,
        message: 'El archivo PFX debe tener extensión .pfx o .p12',
      });
    }
  }

  if (hasPem) {
    const certPath = config.certPath?.toLowerCase() || '';
    const keyPath = config.keyPath?.toLowerCase() || '';

    if (!certPath.endsWith('.pem') && !certPath.endsWith('.crt') && !certPath.endsWith('.cer')) {
      return err({
        code: AEATErrorCode.CertificateInvalid,
        message: 'El certificado PEM debe tener extensión .pem, .crt o .cer',
      });
    }

    if (!keyPath.endsWith('.pem') && !keyPath.endsWith('.key')) {
      return err({
        code: AEATErrorCode.CertificateInvalid,
        message: 'La clave privada debe tener extensión .pem o .key',
      });
    }
  }

  return ok(true);
}

/**
 * Obtiene información del certificado configurado
 */
export function getCertificateInfo(config?: AEATCertificateConfig): CertificateInfo {
  if (!config) {
    return {
      type: 'personal',
      format: 'pfx',
      isConfigured: false,
      description: 'No hay certificado configurado',
    };
  }

  const hasPfx = Boolean(config.pfxPath && config.pfxPassword);
  const hasPem = Boolean(config.certPath && config.keyPath);

  return {
    type: config.type,
    format: hasPfx ? 'pfx' : 'pem',
    isConfigured: hasPfx || hasPem,
    description: CERTIFICATE_DESCRIPTIONS[config.type],
  };
}

/**
 * Obtiene el endpoint AEAT según entorno y tipo de certificado
 */
export function getAEATEndpoint(
  environment: 'test' | 'production',
  certificateType: AEATCertificateType
): string {
  return AEAT_ENDPOINTS[environment][certificateType];
}

// ==================== Helpers ====================

/**
 * Genera la configuración de variables de entorno para el bridge
 */
export function generateBridgeEnvConfig(config: AEATCertificateConfig): Record<string, string> {
  const env: Record<string, string> = {};

  if (config.pfxPath) {
    env.PFX_PATH = config.pfxPath;
    if (config.pfxPassword) {
      env.PFX_PASSWORD = config.pfxPassword;
    }
  } else if (config.certPath && config.keyPath) {
    env.CERT_PATH = config.certPath;
    env.KEY_PATH = config.keyPath;
    if (config.caPath) {
      env.CA_PATH = config.caPath;
    }
    if (config.passphrase) {
      env.CERT_PASSPHRASE = config.passphrase;
    }
  }

  return env;
}

/**
 * Verifica si el certificado requiere contraseña
 */
export function certificateRequiresPassword(config: AEATCertificateConfig): boolean {
  // PFX siempre requiere contraseña
  if (config.pfxPath) {
    return true;
  }

  // PEM puede o no requerir passphrase para la clave privada
  return Boolean(config.passphrase);
}

/**
 * Formatea la ruta del certificado para mostrar (oculta información sensible)
 */
export function formatCertificatePath(path?: string): string {
  if (!path) return 'No configurado';

  // Mostrar solo el nombre del archivo
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1];
}

/**
 * Información de ayuda sobre certificados FNMT
 */
export const FNMT_INFO = {
  personal: {
    name: 'Certificado de Persona Física',
    url: 'https://www.sede.fnmt.gob.es/certificados/persona-fisica',
    description: 'Para personas físicas o representantes legales',
  },
  sello: {
    name: 'Certificado de Sello de Persona Jurídica',
    url: 'https://www.sede.fnmt.gob.es/certificados/persona-juridica',
    description: 'Para empresas y aplicaciones automatizadas',
  },
} as const;
