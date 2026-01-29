import { AlertCircle, CheckCircle, Key, XCircle } from 'lucide-solid';
import { Show } from 'solid-js';
import { toast } from 'solid-sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPlatformService } from '@/services/platform';
import type { LicenseStatus } from '@/types/license';

interface LicenseStatusCardProps {
  licenseStatus: LicenseStatus | null;
  onRefresh: () => void;
  onClearLicense: () => void;
}

const getLicenseTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    basic: 'Básica',
    pro: 'Profesional',
    enterprise: 'Empresarial',
  };
  return labels[type] || type;
};

const getLicenseTypeColor = (type: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    basic: 'secondary',
    pro: 'default',
    enterprise: 'destructive',
  };
  return colors[type] || 'default';
};

export default function LicenseStatusCard(props: LicenseStatusCardProps) {
  const handleClearLicense = async () => {
    try {
      const platform = getPlatformService();
      await platform.clearLicense();
      toast.success('Licencia eliminada correctamente');
      props.onRefresh();
    } catch (error) {
      console.error('Error clearing license:', error);
      toast.error('Error al eliminar la licencia');
    }
  };

  const getStatusIcon = () => {
    if (!props.licenseStatus) {
      return <AlertCircle class="h-5 w-5 text-muted-foreground" />;
    }

    if (props.licenseStatus.is_valid) {
      return <CheckCircle class="h-5 w-5 text-green-500" />;
    }

    return <XCircle class="h-5 w-5 text-destructive" />;
  };

  const getStatusText = () => {
    if (!props.licenseStatus) {
      return 'No activada';
    }

    if (props.licenseStatus.is_valid) {
      return 'Válida';
    }

    if (props.licenseStatus.error_message) {
      return props.licenseStatus.error_message;
    }

    return 'Inválida';
  };

  const getExpiryText = () => {
    if (!props.licenseStatus?.expires_at) {
      return 'Sin límite';
    }

    const days = props.licenseStatus.days_remaining;
    if (days === null || days === undefined) {
      return 'Desconocido';
    }

    if (days < 0) {
      return 'Expirada';
    }

    if (days === 0) {
      return 'Expira hoy';
    }

    if (days === 1) {
      return 'Expira mañana';
    }

    if (days < 30) {
      return `Expira en ${days} días`;
    }

    const months = Math.floor(days / 30);
    return `Expira en ${months} mes${months > 1 ? 'es' : ''}`;
  };

  return (
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Key class="h-5 w-5" />
            <CardTitle>Licencia</CardTitle>
          </div>
          <div class="flex items-center gap-2">
            {getStatusIcon()}
            <span class="text-sm text-muted-foreground">{getStatusText()}</span>
          </div>
        </div>
        <CardDescription>Estado de la licencia de TPV El Haido</CardDescription>
      </CardHeader>

      <CardContent class="space-y-4">
        <Show
          when={props.licenseStatus?.is_activated}
          fallback={
            <div class="text-center py-8 text-muted-foreground">
              <p>No hay una licencia activa</p>
              <p class="text-sm mt-2">Contacta con soporte para obtener una licencia</p>
            </div>
          }
        >
          <div class="space-y-3">
            <Show when={props.licenseStatus?.email}>
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">Email</span>
                <span class="text-sm font-medium">{props.licenseStatus?.email}</span>
              </div>
            </Show>

            <Show when={props.licenseStatus?.license_type}>
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">Tipo</span>
                <Badge variant={getLicenseTypeColor(props.licenseStatus?.license_type || '')}>
                  {getLicenseTypeLabel(props.licenseStatus?.license_type || '')}
                </Badge>
              </div>
            </Show>

            <Show
              when={
                props.licenseStatus?.expires_at !== null &&
                props.licenseStatus?.expires_at !== undefined
              }
            >
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">Expiración</span>
                <span class="text-sm font-medium">{getExpiryText()}</span>
              </div>
            </Show>

            <div class="pt-4 border-t">
              <Button variant="destructive" size="sm" class="w-full" onClick={handleClearLicense}>
                Eliminar Licencia
              </Button>
            </div>
          </div>
        </Show>
      </CardContent>
    </Card>
  );
}
