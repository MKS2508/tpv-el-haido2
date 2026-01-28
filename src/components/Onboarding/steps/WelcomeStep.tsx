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
        <ul class="text-sm text-left space-y-2 max-w-xs mx-auto">
          <li class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
              1
            </span>
            <span>Seleccionar modo de almacenamiento</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
              2
            </span>
            <span>Importar productos y categorias</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
              3
            </span>
            <span>Crear usuarios</span>
          </li>
          <li class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
              4
            </span>
            <span>Personalizar apariencia</span>
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
