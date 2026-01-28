import { CheckCircle2Icon, PartyPopperIcon, RocketIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { OnboardingState } from '@/models/Onboarding';

interface CompleteStepProps {
    state: OnboardingState;
    onComplete: () => void;
}

export function CompleteStep({ state, onComplete }: CompleteStepProps) {
    const userCount = state.createdUsers.length;
    const storageMode = state.selectedStorageMode?.toUpperCase() || 'NO DEFINIDO';

    return (
        <Card className="w-full max-w-lg mx-auto border-none shadow-2xl bg-background/60 backdrop-blur-xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-pink-500 to-primary animate-gradient-x" />

            <CardHeader className="text-center pt-10">
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                    className="mx-auto mb-6 w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
                >
                    <CheckCircle2Icon className="h-10 w-10 text-primary" />
                </motion.div>
                <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                    ¡Todo listo!
                </CardTitle>
                <CardDescription className="text-base mt-2">
                    Has configurado TPV Haido correctamente.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 py-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-center">
                        Resumen de Configuracion
                    </h3>

                    <div className="grid gap-3">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-muted"
                        >
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                                <RocketIcon className="h-4 w-4" />
                                Almacenamiento
                            </span>
                            <span className="font-bold text-sm tracking-tight">{storageMode}</span>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-muted"
                        >
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                                <PartyPopperIcon className="h-4 w-4" />
                                Usuarios Creados
                            </span>
                            <span className="font-bold text-sm tracking-tight">{userCount}</span>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-muted"
                        >
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                                <CheckCircle2Icon className="h-4 w-4" />
                                Datos Iniciales
                            </span>
                            <span className="font-bold text-sm tracking-tight">
                                {state.importedData ? 'IMPORTADOS' : 'SISTEMA LIMPIO'}
                            </span>
                        </motion.div>
                    </div>
                </div>

                <p className="text-center text-sm text-muted-foreground italic px-6">
                    "Tu punto de venta esta ahora optimizado y listo para trabajar."
                </p>
            </CardContent>

            <CardFooter className="pb-10 px-10">
                <Button
                    onClick={onComplete}
                    size="lg"
                    className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    Empezar a usar TPV
                </Button>
            </CardFooter>
        </Card>
    );
}

export default CompleteStep;
