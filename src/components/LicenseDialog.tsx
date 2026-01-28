import { Show, createSignal } from 'solid-js';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { invoke } from '@tauri-apps/api/core';
import type { LicenseActivationRequest, LicenseStatus } from '@/types/license';

interface LicenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (status: LicenseStatus) => void;
}

export default function LicenseDialog(props: LicenseDialogProps) {
  let emailInputRef: HTMLInputElement | undefined;
  let keyInputRef: HTMLInputElement | undefined;

  const [email, setEmail] = createSignal('');
  const [key, setKey] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);

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
        props.onSuccess(status);
        props.onClose();
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

  return (
    <Show when={props.isOpen()}>
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card class="w-full max-w-md mx-4 shadow-lg">
          <CardHeader>
            <CardTitle>Activar Licencia</CardTitle>
            <CardDescription>
              Introduce tu email y clave de licencia para activar TPV El Haido
            </CardDescription>
          </CardHeader>

          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label for="email">Email</Label>
              <Input
                id="email"
                ref={emailInputRef}
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
                ref={keyInputRef}
                type="text"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={key()}
                onInput={handleKeyInput}
                disabled={isLoading()}
                class="uppercase font-mono"
                maxlength={19}
              />
              <p class="text-xs text-muted-foreground">
                Formato: XXXX-XXXX-XXXX-XXXX
              </p>
            </div>

            <Show when={isLoading()}>
              <div class="flex items-center justify-center py-4">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            </Show>
          </CardContent>

          <CardFooter class="flex justify-between">
            <Button
              variant="ghost"
              onClick={props.onClose}
              disabled={isLoading()}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleActivate}
              disabled={isLoading()}
            >
              Activar
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Show>
  );
}
