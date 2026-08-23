import { RocketIcon } from 'lucide-solid';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep(props: WelcomeStepProps) {
  return (
    <Card class="w-full max-w-lg mx-auto">
      <CardHeader class="text-center">
        <div class="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <RocketIcon class="h-8 w-8 text-primary" />
        </div>
        <CardTitle class="text-2xl">Bienvenido a TPV Haido</CardTitle>
        <CardDescription>
          Vamos a configurar tu punto de venta en unos sencillos pasos.
        </CardDescription>
      </CardHeader>
      <CardContent class="text-center space-y-4">
        <p class="text-muted-foreground">
          Este asistente te guiara a traves de la configuracion inicial:
        </p>
        <ul class="text-sm text-left space-y-3 max-w-sm mx-auto">
          <li class="flex items-center gap-3">
            <span class="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
              1
            </span>
            <span class="text-foreground">Bienvenida y bienvenida</span>
          </li>
          <li class="flex items-center gap-3">
            <span class="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
              2
            </span>
            <span class="text-foreground">Seleccionar modo de almacenamiento</span>
          </li>
          <li class="flex items-center gap-3">
            <span class="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
              3
            </span>
            <span class="text-foreground">Importar productos y categorías</span>
          </li>
          <li class="flex items-center gap-3">
            <span class="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
              4
            </span>
            <span class="text-foreground">Crear usuarios</span>
          </li>
          <li class="flex items-center gap-3">
            <span class="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
              5
            </span>
            <span class="text-foreground">Personalizar apariencia</span>
          </li>
          <li class="flex items-center gap-3">
            <span class="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
              6
            </span>
            <span class="text-foreground">Finalizar y empezar a usar TPV</span>
          </li>
        </ul>
      </CardContent>
      <CardFooter class="justify-center">
        <Button onClick={props.onNext} size="lg">
          Comenzar
        </Button>
      </CardFooter>
    </Card>
  );
}

export default WelcomeStep;
