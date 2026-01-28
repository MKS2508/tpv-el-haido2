import { Printer, Wifi } from 'lucide-solid';
import { createSignal, For } from 'solid-js';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  BreakLine,
  CharacterSet,
  PrinterTypes,
  type ThermalPrinterServiceOptions,
} from '@/models/ThermalPrinter.ts';

interface ThermalPrinterSettingsProps {
  options: ThermalPrinterServiceOptions;
  onOptionsChange: (newOptions: ThermalPrinterServiceOptions) => void;
  onPrintTestTicket: () => Promise<string>;
  onTestConnection: () => Promise<string>;
}

const defaultOptions: ThermalPrinterServiceOptions = {
  type: PrinterTypes.EPSON,
  interface: '192.168.1.100',
  characterSet: CharacterSet.PC852_LATIN2,
  removeSpecialCharacters: false,
  lineCharacter: '-',
  breakLine: BreakLine.WORD,
  options: { timeout: 3000 },
};

export default function ThermalPrinterSettings(props: ThermalPrinterSettingsProps) {
  const [isDialogOpen, setIsDialogOpen] = createSignal(false);
  const [testTicketDialogOpen, setTestTicketDialogOpen] = createSignal(false);
  const [connectionStatus, setConnectionStatus] = createSignal<boolean | null>(null);
  const [testTicketResult, setTestTicketResult] = createSignal('');

  const handleChange = (field: keyof ThermalPrinterServiceOptions, value: unknown): void => {
    props.onOptionsChange({ ...props.options, [field]: value });
  };

  const handleTestTicket = async () => {
    setTestTicketDialogOpen(true);
    const result = await props.onPrintTestTicket();
    setTestTicketResult(result);
  };
  const handleTestConnection = async () => {
    setIsDialogOpen(true);
    const result = await props.onTestConnection();
    setConnectionStatus(result.toLowerCase().indexOf('true') !== -1);
  };

  return (
    <div class="space-y-4 mt-4 pb-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="printerType">Tipo de Impresora</Label>
          <Select
            value={props.options.type}
            onValueChange={(value) => handleChange('type', value as PrinterTypes)}
          >
            <SelectTrigger id="printerType">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <For each={Object.values(PrinterTypes)}>
                {(type: PrinterTypes) => <SelectItem value={type}>{type}</SelectItem>}
              </For>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="interface">Interfaz de Conexión</Label>
          <Input
            id="interface"
            value={options.interface}
            onInput={(e) => handleChange('interface', e.currentTarget.value)}
            placeholder="tcp://xxx.xxx.xxx.xxx"
          />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="characterSet">Conjunto de Caracteres</Label>
          <Select
            value={options.characterSet}
            onValueChange={(value) => handleChange('characterSet', value as CharacterSet)}
          >
            <SelectTrigger id="characterSet">
              <SelectValue placeholder="Seleccionar conjunto" />
            </SelectTrigger>
            <SelectContent>
              <For each={Object.values(CharacterSet)}>
                {(set: CharacterSet) => <SelectItem value={set}>{set}</SelectItem>}
              </For>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="breakLine">Modo de Corte de Línea</Label>
          <Select
            value={options.breakLine}
            onValueChange={(value) => handleChange('breakLine', value as BreakLine)}
          >
            <SelectTrigger id="breakLine">
              <SelectValue placeholder="Seleccionar modo" />
            </SelectTrigger>
            <SelectContent>
              <For each={Object.values(BreakLine)}>
                {(mode: BreakLine) => <SelectItem value={mode}>{mode}</SelectItem>}
              </For>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-4 items-center">
        <div class="space-y-2">
          <Label for="lineCharacter">Caracter de Línea</Label>
          <Select
            value={options.lineCharacter}
            onValueChange={(value) => handleChange('lineCharacter', value)}
          >
            <SelectTrigger id="lineCharacter">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <For each={['-', '_', '=', '*']}>
                {(char: string) => <SelectItem value={char}>{char}</SelectItem>}
              </For>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2 col-span-2">
          <Label for="timeout">
            Tiempo de Espera: {(options.options as { timeout: number }).timeout}ms
          </Label>
          <input
            type="range"
            id="timeout"
            min={1000}
            max={10000}
            step={100}
            value={(options.options as { timeout: number }).timeout}
            onInput={(e: InputEvent) =>
              handleChange('options', {
                ...options.options,
                timeout: Number((e.currentTarget as HTMLInputElement).value),
              })
            }
            class="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <Switch
          id="removeSpecialCharacters"
          checked={options.removeSpecialCharacters}
          onChange={(checked: boolean) => handleChange('removeSpecialCharacters', checked)}
        />
        <Label for="removeSpecialCharacters">Eliminar Caracteres Especiales</Label>
      </div>
      <div class="grid grid-cols-2 gap-4 pt-4">
        <Button onClick={handleTestTicket} class="w-full">
          <Printer class="mr-2 h-4 w-4" /> Imprimir Ticket de Prueba
        </Button>
        <Button onClick={handleTestConnection} class="w-full">
          <Wifi class="mr-2 h-4 w-4" /> Probar Conexión
        </Button>
      </div>
      <Dialog open={isDialogOpen()} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estado de la Conexión</DialogTitle>
          </DialogHeader>
          <div class="py-4">
            {connectionStatus() === null ? (
              <p>Probando conexión...</p>
            ) : connectionStatus() ? (
              <p class="text-primary">Conexión exitosa</p>
            ) : (
              <p class="text-destructive">Error de conexión</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={testTicketDialogOpen()} onOpenChange={setTestTicketDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estado de la Impresión</DialogTitle>
          </DialogHeader>
          <div class="py-4">
            {testTicketResult() === '' ? (
              <p>Intentando imprimir...</p>
            ) : testTicketResult().indexOf('Error') !== -1 ? (
              <p class="text-destructive">Error al imprimir ticket: {testTicketResult()}</p>
            ) : (
              <p class="text-primary">Ticket impreso con éxito</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
