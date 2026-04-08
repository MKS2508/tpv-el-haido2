import { Motion } from '@motionone/solid';
import { CheckCircle2Icon, PartyPopperIcon, RocketIcon } from 'lucide-solid';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { OnboardingState } from '@/models/Onboarding';

interface CompleteStepProps {
  state: OnboardingState;
  onComplete: () => void;
}

export function CompleteStep(props: CompleteStepProps) {
  const userCount = () => props.state.createdUsers.length;
  const storageMode = () => props.state.selectedStorageMode?.toUpperCase() || 'NO DEFINIDO';

  return (
    <Card class="w-full max-w-lg mx-auto border-none shadow-2xl bg-background/60 backdrop-blur-xl overflow-hidden">
      <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-pink-500 to-primary animate-gradient-x" />
      <CardHeader class="text-center pt-10">
        <Motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ easing: 'spring', duration: 0.8 }}
          class="mx-auto mb-6 w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <CheckCircle2Icon class="h-10 w-10 text-primary" />
        </Motion.div>
        <CardTitle class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
          ¡Todo listo!
        </CardTitle>
        <CardDescription class="text-base mt-2">
          Has configurado TPV Haido correctamente.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6 py-6">
        <div class="space-y-4">
          <h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-center">
            Resumen de Configuracion
          </h3>

          <div class="grid gap-3">
            <Motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              class="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-muted"
            >
              <span class="text-sm text-muted-foreground flex items-center gap-2">
                <RocketIcon class="h-4 w-4" />
                Almacenamiento
              </span>
              <span class="font-bold text-sm tracking-tight">{storageMode()}</span>
            </Motion.div>

            <Motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              class="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-muted"
            >
              <span class="text-sm text-muted-foreground flex items-center gap-2">
                <PartyPopperIcon class="h-4 w-4" />
                Usuarios Creados
              </span>
              <span class="font-bold text-sm tracking-tight">{userCount()}</span>
            </Motion.div>

            <Motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              class="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-muted"
            >
              <span class="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2Icon class="h-4 w-4" />
                Datos Iniciales
              </span>
              <span class="font-bold text-sm tracking-tight">
                {props.state.importedData ? 'IMPORTADOS' : 'SISTEMA LIMPIO'}
              </span>
            </Motion.div>
          </div>
        </div>

        <p class="text-center text-sm text-muted-foreground italic px-6">
          "Tu punto de venta esta ahora optimizado y listo para trabajar."
        </p>
      </CardContent>
      <CardFooter class="pb-10 px-10">
        <Button
          onClick={props.onComplete}
          size="lg"
          class="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          Empezar a usar TPV
        </Button>
      </CardFooter>
    </Card>
  );
}

export default CompleteStep;
