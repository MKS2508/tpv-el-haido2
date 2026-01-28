import { Show, createSignal, onMount } from 'solid-js';
import { Motion } from '@motionone/solid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'solid-sonner';
import { invoke } from '@tauri-apps/api/core';
import { Key, Loader2 } from 'lucide-solid';
import type { LicenseStatus, LicenseActivationRequest } from '@/types/license';

interface LicenseSplashScreenProps {
  onComplete: (status: LicenseStatus) => void;
}

export default function LicenseSplashScreen(props: LicenseSplashScreenProps) {
  const [email, setEmail] = createSignal('');
  const [key, setKey] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);
  const [isChecking, setIsChecking] = createSignal(true);

  const formatKey = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const formatted = cleaned.replace(/(.{4})(?=.)/g, '$1-').slice(0, 19);
    return formatted;
  };

  const handleKeyInput = (e: InputEvent) => {
    const target = e.target as HTMLInputElement;
    setKey(formatKey(target.value));
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email())) {
      toast.error('Por favor introduce un email válido');
      return false;
    }

    const keyRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!keyRegex.test(key())) {
      toast.error('La clave de licencia debe tener el formato XXXX-XXXX-XXXX-XXXX');
      return false;
    }

    return true;
  };

  const handleActivate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const request: LicenseActivationRequest = {
        key: key(),
        email: email(),
      };

      const status = await invoke<LicenseStatus>('validate_and_activate_license', {
        key: request.key,
        email: request.email,
      });

      if (status.is_valid) {
        toast.success('Licencia activada correctamente');
        props.onComplete(status);
      } else {
        toast.error(status.error_message || 'Error al activar la licencia');
      }
    } catch (error) {
      console.error('Error activating license:', error);
      toast.error('Error de conexión con el servidor de licencias');
    } finally {
      setIsLoading(false);
    }
  };

  onMount(async () => {
    try {
      const status = await invoke<LicenseStatus>('check_license_status');

      if (status.is_activated && status.is_valid) {
        props.onComplete(status);
      }
    } catch (error) {
      console.error('Error checking license status:', error);
    } finally {
      setIsChecking(false);
    }
  });

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <Motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        class="w-full max-w-md mx-4"
      >
        <div class="bg-card border rounded-3xl shadow-2xl p-8 space-y-6">
          <Show when={!isChecking()}>
            <div class="text-center space-y-2">
              <div class="flex justify-center">
                <div class="p-4 bg-primary/10 rounded-full">
                  <Key class="h-12 w-12 text-primary" />
                </div>
              </div>
              <h1 class="text-3xl font-bold">TPV El Haido</h1>
              <p class="text-muted-foreground">
                Activa tu licencia para comenzar
              </p>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <Label for="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email()}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                  disabled={isLoading()}
                />
              </div>

              <div class="space-y-2">
                <Label for="key">Clave de Licencia</Label>
                <Input
                  id="key"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={key()}
                  onInput={handleKeyInput}
                  disabled={isLoading()}
                  class="uppercase font-mono text-center tracking-wider"
                  maxlength={19}
                />
                <p class="text-xs text-muted-foreground text-center">
                  Formato: XXXX-XXXX-XXXX-XXXX
                </p>
              </div>

              <Button
                onClick={handleActivate}
                disabled={isLoading()}
                class="w-full"
                size="lg"
              >
                <Show when={isLoading()} fallback="Activar Licencia">
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  Activando...
                </Show>
              </Button>
            </div>

            <div class="text-center text-sm text-muted-foreground">
              <p>¿No tienes una licencia?</p>
              <a
                href="mailto:soporte@elhaido.com"
                class="text-primary hover:underline"
              >
                Contacta con soporte
              </a>
            </div>
          </Show>

          <Show when={isChecking()}>
            <div class="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 class="h-16 w-16 animate-spin text-primary" />
              <p class="text-muted-foreground">Verificando licencia...</p>
            </div>
          </Show>
        </div>
      </Motion.div>
    </div>
  );
}
