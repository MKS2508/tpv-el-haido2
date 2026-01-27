import React, { useEffect } from 'react';
import { useUpdater } from '@/hooks/useUpdater';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Download, RefreshCw, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface UpdateCheckerProps {
    autoCheck?: boolean;
    checkInterval?: number; // in milliseconds
}

export const UpdateChecker: React.FC<UpdateCheckerProps> = ({
    autoCheck = true,
    checkInterval = 60 * 60 * 1000, // 1 hour default
}) => {
    const {
        available,
        checking: _checking,
        downloading,
        error,
        progress,
        version,
        notes,
        checkForUpdates,
        downloadAndInstall,
        dismissUpdate,
    } = useUpdater();

    // Auto-check on mount and periodically
    useEffect(() => {
        if (!autoCheck) return;

        // Check on mount
        checkForUpdates();

        // Set up interval
        const interval = setInterval(() => {
            checkForUpdates();
        }, checkInterval);

        return () => clearInterval(interval);
    }, [autoCheck, checkInterval, checkForUpdates]);

    const progressPercent = progress?.contentLength
        ? Math.round((progress.downloaded / progress.contentLength) * 100)
        : 0;

    return (
        <Dialog open={available} onOpenChange={(open) => !open && dismissUpdate()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-primary" />
                        Nueva actualización disponible
                    </DialogTitle>
                    <DialogDescription>
                        Versión {version} está disponible para descargar.
                    </DialogDescription>
                </DialogHeader>

                {notes && (
                    <div className="max-h-40 overflow-y-auto rounded-md bg-muted p-3 text-sm">
                        <p className="font-medium mb-1">Novedades:</p>
                        <p className="text-muted-foreground whitespace-pre-wrap">{notes}</p>
                    </div>
                )}

                {downloading && progress && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Descargando...</span>
                            <span>{progressPercent}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        {progress.contentLength && (
                            <p className="text-xs text-muted-foreground text-center">
                                {(progress.downloaded / 1024 / 1024).toFixed(1)} MB / {(progress.contentLength / 1024 / 1024).toFixed(1)} MB
                            </p>
                        )}
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{error}</span>
                    </div>
                )}

                <DialogFooter className="flex gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={dismissUpdate}
                        disabled={downloading}
                    >
                        <X className="h-4 w-4 mr-2" />
                        Más tarde
                    </Button>
                    <Button
                        onClick={downloadAndInstall}
                        disabled={downloading}
                    >
                        {downloading ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Instalando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Actualizar ahora
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// Manual check button component for settings
export const UpdateCheckButton: React.FC = () => {
    const { checking, checkForUpdates, available, error } = useUpdater();

    return (
        <Button
            variant="outline"
            onClick={checkForUpdates}
            disabled={checking}
            className="w-full"
        >
            {checking ? (
                <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Buscando actualizaciones...
                </>
            ) : available ? (
                <>
                    <Download className="h-4 w-4 mr-2 text-primary" />
                    Actualización disponible
                </>
            ) : error ? (
                <>
                    <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
                    Error al buscar
                </>
            ) : (
                <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Buscar actualizaciones
                </>
            )}
        </Button>
    );
};

export default UpdateChecker;
