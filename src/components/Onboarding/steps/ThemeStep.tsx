import { PaletteIcon, SparklesIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

interface ThemeStepProps {
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
}

export function ThemeStep({ onNext, onBack, onSkip }: ThemeStepProps) {
    return (
        <Card className="w-full max-w-lg mx-auto border-none shadow-2xl bg-background/60 backdrop-blur-xl">
            <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
                        <PaletteIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">Personalizacion</CardTitle>
                        <CardDescription>
                            Elige el estilo que mejor se adapte a tu negocio.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-8 py-8">
                <div className="flex flex-col items-center justify-center text-center space-y-6">
                    <motion.div
                        animate={{
                            scale: [1, 1.05, 1],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-primary to-pink-500 flex items-center justify-center shadow-lg shadow-primary/20"
                    >
                        <SparklesIcon className="h-12 w-12 text-white" />
                    </motion.div>

                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Prueba diferentes temas</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            Puedes cambiar colores, fuentes y el modo oscuro en tiempo real.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-muted/40 border-2 border-dashed border-muted flex flex-col items-center gap-4 w-full">
                        <ThemeSwitcher />
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                            Vista Previa en Vivo
                        </p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6 bg-muted/10">
                <Button variant="ghost" onClick={onBack}>
                    Anterior
                </Button>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={onSkip}>
                        Saltar
                    </Button>
                    <Button onClick={onNext} className="bg-primary hover:bg-primary/90">
                        Me gusta este estilo
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}

export default ThemeStep;
