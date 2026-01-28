import { DatabaseIcon, FileJsonIcon, FlaskConicalIcon, InfoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FileImporter } from '../components/FileImporter';
import type { ImportData } from '@/models/Onboarding';

interface ImportDataStepProps {
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
    onFileSelect: (file: File) => Promise<boolean>;
    onLoadSeedData: () => Promise<boolean>;
    onApplyData: () => Promise<boolean>;
    importedData: ImportData | null;
    onClearData: () => void;
}

export function ImportDataStep({
    onNext,
    onBack,
    onSkip,
    onFileSelect,
    onLoadSeedData,
    onApplyData,
    importedData,
    onClearData,
}: ImportDataStepProps) {
    const handleApply = async () => {
        const success = await onApplyData();
        if (success) {
            onNext();
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto border-none shadow-2xl bg-background/60 backdrop-blur-xl">
            <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <DatabaseIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">Importar Datos</CardTitle>
                        <CardDescription>
                            Comienza con datos existentes o usa nuestra base de datos de ejemplo.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {!importedData ? (
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 font-semibold">
                                <FileJsonIcon className="h-4 w-4 text-primary" />
                                Tu propio archivo
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Si ya tienes un respaldo de TPV Haido en formato JSON, puedes cargarlo aqui.
                            </p>
                            <FileImporter
                                onFileSelect={onFileSelect}
                                importedData={importedData}
                                onClear={onClearData}
                            />
                        </div>

                        <div className="space-y-4 flex flex-col">
                            <div className="flex items-center gap-2 font-semibold">
                                <FlaskConicalIcon className="h-4 w-4 text-primary" />
                                Datos de ejemplo
                            </div>
                            <p className="text-sm text-muted-foreground">
                                ¿Solo quieres probar? Carga nuestra base de datos de ejemplo con productos, categorias y mesas preconfiguradas.
                            </p>
                            <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg p-6 bg-primary/5 border-primary/20">
                                <Button
                                    variant="outline"
                                    className="bg-background hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                                    onClick={onLoadSeedData}
                                >
                                    <DatabaseIcon className="mr-2 h-4 w-4" />
                                    Cargar datos de ejemplo
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <InfoIcon className="h-5 w-5 text-primary" />
                                Resumen de importacion
                            </h3>
                            <FileImporter
                                onFileSelect={onFileSelect}
                                importedData={importedData}
                                onClear={onClearData}
                            />
                            <p className="text-xs text-muted-foreground mt-4 text-center italic">
                                * Los datos se aplicaran permanentemente al confirmar.
                            </p>
                        </div>
                    </div>
                )}

                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4 flex items-start gap-3">
                    <InfoIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <p className="text-sm text-yellow-700 dark:text-yellow-500">
                        <strong>Paso opcional:</strong> Si prefieres configurar todo desde cero despues de completar el asistente, puedes saltar este paso.
                    </p>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6 bg-muted/20">
                <Button variant="ghost" onClick={onBack}>
                    Anterior
                </Button>
                <div className="flex gap-3">
                    {!importedData && (
                        <Button variant="outline" onClick={onSkip}>
                            Saltar paso
                        </Button>
                    )}
                    {importedData ? (
                        <Button onClick={handleApply} className="bg-primary hover:bg-primary/90">
                            Aplicar e Importar
                        </Button>
                    ) : (
                        <Button disabled>Continuar</Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}

export default ImportDataStep;
