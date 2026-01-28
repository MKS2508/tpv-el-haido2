import { Show } from 'solid-js';
import { DatabaseIcon, FileJsonIcon, FlaskConicalIcon, InfoIcon } from 'lucide-solid';
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

export function ImportDataStep(props: ImportDataStepProps) {
    const handleApply = async () => {
        const success = await props.onApplyData();
        if (success) {
            props.onNext();
        }
    };

    return (
        <Card class="w-full max-w-2xl mx-auto border-none shadow-2xl bg-background/60 backdrop-blur-xl">
            <CardHeader>
                <div class="flex items-center gap-3 mb-2">
                    <div class="p-2 rounded-lg bg-primary/10 text-primary">
                        <DatabaseIcon class="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle class="text-2xl">Importar Datos</CardTitle>
                        <CardDescription>
                            Comienza con datos existentes o usa nuestra base de datos de ejemplo.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent class="space-y-6">
                <Show
                    when={props.importedData}
                    fallback={
                        <div class="grid md:grid-cols-2 gap-6">
                            <div class="space-y-4">
                                <div class="flex items-center gap-2 font-semibold">
                                    <FileJsonIcon class="h-4 w-4 text-primary" />
                                    Tu propio archivo
                                </div>
                                <p class="text-sm text-muted-foreground">
                                    Si ya tienes un respaldo de TPV Haido en formato JSON, puedes cargarlo aqui.
                                </p>
                                <FileImporter
                                    onFileSelect={props.onFileSelect}
                                    importedData={props.importedData}
                                    onClear={props.onClearData}
                                />
                            </div>

                            <div class="space-y-4 flex flex-col">
                                <div class="flex items-center gap-2 font-semibold">
                                    <FlaskConicalIcon class="h-4 w-4 text-primary" />
                                    Datos de ejemplo
                                </div>
                                <p class="text-sm text-muted-foreground">
                                    ¿Solo quieres probar? Carga nuestra base de datos de ejemplo con productos, categorias y mesas preconfiguradas.
                                </p>
                                <div class="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg p-6 bg-primary/5 border-primary/20">
                                    <Button
                                        variant="outline"
                                        class="bg-background hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                                        onClick={props.onLoadSeedData}
                                    >
                                        <DatabaseIcon class="mr-2 h-4 w-4" />
                                        Cargar datos de ejemplo
                                    </Button>
                                </div>
                            </div>
                        </div>
                    }
                >
                    <div class="space-y-6">
                        <div class="bg-primary/5 border border-primary/20 rounded-xl p-6">
                            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                                <InfoIcon class="h-5 w-5 text-primary" />
                                Resumen de importacion
                            </h3>
                            <FileImporter
                                onFileSelect={props.onFileSelect}
                                importedData={props.importedData}
                                onClear={props.onClearData}
                            />
                            <p class="text-xs text-muted-foreground mt-4 text-center italic">
                                * Los datos se aplicaran permanentemente al confirmar.
                            </p>
                        </div>
                    </div>
                </Show>

                <div class="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4 flex items-start gap-3">
                    <InfoIcon class="h-5 w-5 text-yellow-600 mt-0.5" />
                    <p class="text-sm text-yellow-700 dark:text-yellow-500">
                        <strong>Paso opcional:</strong> Si prefieres configurar todo desde cero despues de completar el asistente, puedes saltar este paso.
                    </p>
                </div>
            </CardContent>
            <CardFooter class="flex justify-between border-t p-6 bg-muted/20">
                <Button variant="ghost" onClick={props.onBack}>
                    Anterior
                </Button>
                <div class="flex gap-3">
                    <Show when={!props.importedData}>
                        <Button variant="outline" onClick={props.onSkip}>
                            Saltar paso
                        </Button>
                    </Show>
                    <Show
                        when={props.importedData}
                        fallback={<Button disabled>Continuar</Button>}
                    >
                        <Button onClick={handleApply} class="bg-primary hover:bg-primary/90">
                            Aplicar e Importar
                        </Button>
                    </Show>
                </div>
            </CardFooter>
        </Card>
    );
}

export default ImportDataStep;
