import { RocketIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <RocketIcon className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Bienvenido a TPV Haido</CardTitle>
        <CardDescription>
          Vamos a configurar tu punto de venta en unos sencillos pasos.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground">
          Este asistente te guiara a traves de la configuracion inicial:
        </p>
        <ul className="text-sm text-left space-y-2 max-w-xs mx-auto">
          <li className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">1</span>
            <span>Seleccionar modo de almacenamiento</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">2</span>
            <span>Importar productos y categorias</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">3</span>
            <span>Crear usuarios</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">4</span>
            <span>Personalizar apariencia</span>
          </li>
        </ul>
      </CardContent>
      <CardFooter className="justify-center">
        <Button onClick={onNext} size="lg">
          Comenzar
        </Button>
      </CardFooter>
    </Card>
  );
}

export default WelcomeStep;
