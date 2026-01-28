import { invoke } from '@tauri-apps/api/core';
import {
  Cloud,
  Database,
  DollarSign,
  FileText,
  HardDrive,
  Info,
  Key,
  Pencil,
  PlusCircle,
  ShieldCheck,
  Trash2,
  Wand2,
} from 'lucide-solid';
import { type Component, createSignal, For, Match, onMount, Show, Switch } from 'solid-js';
import AEATSettings from '@/components/AEATSettings';
import DemoDataLoader from '@/components/DemoDataLoader';
import LicenseStatusCard from '@/components/LicenseStatus';
import { useOnboardingContext } from '@/components/Onboarding/OnboardingProvider';
import { ThemeDebugger } from '@/components/ThemeDebugger';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import ThermalPrinterSettings from '@/components/ThermalPrinterSettings.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Switch as SwitchUI } from '@/components/ui/switch.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { toast } from '@/components/ui/use-toast.ts';
import VersionInfo from '@/components/VersionInfo';
import type { ThermalPrinterServiceOptions } from '@/models/ThermalPrinter.ts';
import type User from '@/models/User.ts';
import type { StorageMode } from '@/services/storage-adapter.interface';
import {
  openCashDrawerOnly,
  runThermalPrinterCommand,
} from '@/services/thermal-printer.service.ts';
import useStore from '@/store/store';

type SettingsPanelProps = {
  isSidebarOpen: boolean;
  selectedUser: User;
  setSelectedUser: (user: User) => void;
  users: User[];
  setUsers: (users: User[]) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  thermalPrinterOptions: ThermalPrinterServiceOptions;
  handleThermalPrinterOptionsChange: (options: ThermalPrinterServiceOptions) => void;
};

const SettingsPanel: Component<SettingsPanelProps> = (props) => {
  const {
    state,
    setStorageMode,
    setUseStockImages,
    setTouchOptimizationsEnabled,
    setAutoOpenCashDrawer,
    setTaxRate,
  } = useStore();
  const { restartOnboarding } = useOnboardingContext();

  const [isUserDialogOpen, setIsUserDialogOpen] = createSignal(false);
  const [editingUser, setEditingUser] = createSignal<User | null>(null);
  const [newUser, setNewUser] = createSignal<Partial<User>>({
    name: '',
    profilePicture: '',
    pin: '',
  });
  const [activeTab, setActiveTab] = createSignal('general');
  const [isStorageModeDialogOpen, setIsStorageModeDialogOpen] = createSignal(false);
  const [pendingStorageMode, setPendingStorageMode] = createSignal<StorageMode | null>(null);

  const refreshLicenseStatus = async () => {
    try {
      const status = await invoke('check_license_status');
      useStore().setLicenseStatus(status as LicenseStatus);
    } catch (error) {
      console.error('Error refreshing license status:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setNewUser(user);
    setIsUserDialogOpen(true);
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setNewUser({ name: '', profilePicture: '', pin: '' });
    setIsUserDialogOpen(true);
  };

  const handleSaveUser = () => {
    const editing = editingUser();
    if (editing) {
      props.setUsers(props.users.map((u) => (u.id === editing.id ? { ...u, ...newUser() } : u)));
      if (props.selectedUser.id === editing.id) {
        props.setSelectedUser({ ...props.selectedUser, ...newUser() } as User);
      }
    } else {
      const newId = Math.max(...props.users.map((u) => u.id)) + 1;
      props.setUsers([...props.users, { ...(newUser() as User), id: newId }]);
    }
    setIsUserDialogOpen(false);
  };

  const handleDeleteUser = (userId: number) => {
    props.setUsers(props.users.filter((u) => u.id !== userId));
    if (props.selectedUser.id === userId) {
      props.setSelectedUser(props.users.find((u) => u.id !== userId) || props.users[0]);
    }
  };

  async function handlePrintTestTicket() {
    let result = '';
    try {
      result = await runThermalPrinterCommand('isConnected,execute,raw(Hello World)');
      console.log('Printer command result:', result);
      if (result.indexOf('Error') !== -1 || result.indexOf('error') !== -1) {
        toast({
          title: 'Error al imprimir ticket',
          description: 'No se pudo imprimir el ticket. Por favor, intentelo de nuevo.',
          duration: 3000,
        });
      } else {
        toast({
          title: 'Ticket impreso',
          description: 'Ticket impreso con exito.',
          duration: 3000,
        });
      }
      return result;
    } catch (error) {
      console.error('Failed to print:', error);
      return result;
    }
  }

  const handleTestConnection = async () => {
    console.log('Testing connection...');
    const result = await runThermalPrinterCommand('isConnected');
    console.log('Printer command result:', result);
    if (result.indexOf('true') !== -1) {
      toast({
        title: 'Conexion exitosa',
        description: 'La conexion se ha establecido con exito.',
        duration: 3000,
      });
    } else {
      toast({
        title: 'Error de conexion',
        description:
          'No se ha podido establecer la conexion. Por favor, revise los ajustes de la impresora.',
        duration: 3000,
      });
    }
    return result;
  };

  const handleStorageModeToggle = (newMode: StorageMode) => {
    if (newMode !== state.storageMode) {
      setPendingStorageMode(newMode);
      setIsStorageModeDialogOpen(true);
    }
  };

  const getStorageModeDescription = (mode: StorageMode) => {
    switch (mode) {
      case 'sqlite':
        return 'SQLite nativo';
      case 'http':
        return 'Base de datos externa HTTP';
      case 'indexeddb':
        return 'IndexedDB local';
      default:
        return mode;
    }
  };

  const confirmStorageModeChange = () => {
    const pending = pendingStorageMode();
    if (pending) {
      setStorageMode(pending);
      localStorage.setItem('tpv-storage-mode', pending);

      toast({
        title: 'Modo de almacenamiento cambiado',
        description: `Ahora usando ${getStorageModeDescription(pending)}`,
        duration: 3000,
      });
    }
    setIsStorageModeDialogOpen(false);
    setPendingStorageMode(null);
  };

  const cancelStorageModeChange = () => {
    setIsStorageModeDialogOpen(false);
    setPendingStorageMode(null);
  };

  // Load storage mode and touch optimizations from localStorage on component mount
  onMount(() => {
    const savedMode = localStorage.getItem('tpv-storage-mode') as StorageMode | null;
    if (
      savedMode &&
      (savedMode === 'sqlite' || savedMode === 'http' || savedMode === 'indexeddb')
    ) {
      setStorageMode(savedMode);
    }

    const savedTouchOptimizations = localStorage.getItem('tpv-touch-optimizations');
    if (savedTouchOptimizations !== null) {
      setTouchOptimizationsEnabled(savedTouchOptimizations === 'true');
    }
  });

  return (
    <div class={`space-y-0 p-0 ${props.isSidebarOpen ? 'ml-1' : ''} bg-background text-foreground`}>
      <Tabs value={activeTab()} onChange={setActiveTab}>
        <TabsList class="mb-0 flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Apariencia</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="printing">Impresion</TabsTrigger>
          <TabsTrigger value="pos">Punto de Venta</TabsTrigger>
          <TabsTrigger value="verifactu" class="flex items-center gap-1">
            <FileText class="h-3 w-3" />
            VERI*FACTU
          </TabsTrigger>
          <TabsTrigger value="license" class="flex items-center gap-1">
            <Key class="h-3 w-3" />
            Licencia
          </TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="about" class="flex items-center gap-1">
            <Info class="h-3 w-3" />
            Acerca de
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configuracion General</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="flex items-center justify-between">
                <Label for="darkMode">Modo Oscuro</Label>
                <SwitchUI
                  id="darkMode"
                  checked={props.isDarkMode}
                  onChange={props.toggleDarkMode}
                />
              </div>
              <div class="flex items-center justify-between">
                <Label for="touchOptimizations">Optimizaciones Tactiles</Label>
                <SwitchUI
                  id="touchOptimizations"
                  checked={state.touchOptimizationsEnabled}
                  onChange={setTouchOptimizationsEnabled}
                />
              </div>

              <div class="space-y-3 border-t pt-4">
                <div class="flex items-center justify-between">
                  <div class="flex flex-col space-y-1">
                    <Label for="storageMode" class="font-medium">
                      Modo de Almacenamiento
                    </Label>
                    <p class="text-xs text-muted-foreground">
                      <Switch>
                        <Match when={state.storageMode === 'sqlite'}>
                          SQLite integrado (recomendado)
                        </Match>
                        <Match when={state.storageMode === 'http'}>
                          Base de datos externa HTTP
                        </Match>
                        <Match when={state.storageMode === 'indexeddb'}>
                          IndexedDB local (navegador)
                        </Match>
                      </Switch>
                    </p>
                  </div>
                  <Select<string>
                    value={state.storageMode}
                    onChange={(value) => value && handleStorageModeToggle(value as StorageMode)}
                    options={['sqlite', 'http', 'indexeddb']}
                    itemComponent={(itemProps) => (
                      <SelectItem value={itemProps.item.rawValue}>
                        <Switch>
                          <Match when={itemProps.item.rawValue === 'sqlite'}>
                            <span class="flex items-center gap-2">
                              <HardDrive class="h-4 w-4" />
                              SQLite (Nativo)
                            </span>
                          </Match>
                          <Match when={itemProps.item.rawValue === 'http'}>
                            <span class="flex items-center gap-2">
                              <Cloud class="h-4 w-4" />
                              HTTP API
                            </span>
                          </Match>
                          <Match when={itemProps.item.rawValue === 'indexeddb'}>
                            <span class="flex items-center gap-2">
                              <Database class="h-4 w-4" />
                              IndexedDB
                            </span>
                          </Match>
                        </Switch>
                      </SelectItem>
                    )}
                  >
                    <SelectTrigger class="w-[180px]">
                      <SelectValue placeholder="Selecciona modo" />
                    </SelectTrigger>
                    <SelectContent />
                  </Select>
                </div>
                <div class="text-xs text-muted-foreground bg-secondary/50 p-2 rounded space-y-1">
                  <div>
                    <strong>
                      <HardDrive class="h-3 w-3 inline mr-1" />
                      SQLite:
                    </strong>{' '}
                    Base de datos nativa, mejor rendimiento, funciona sin conexion
                  </div>
                  <div>
                    <strong>
                      <Cloud class="h-3 w-3 inline mr-1" />
                      HTTP API:
                    </strong>{' '}
                    Datos centralizados, requiere servidor externo
                  </div>
                  <div>
                    <strong>
                      <Database class="h-3 w-3 inline mr-1" />
                      IndexedDB:
                    </strong>{' '}
                    Almacenamiento del navegador, fallback para desarrollo
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between">
                <Label for="language">Idioma</Label>
                <Select<string>
                  defaultValue="es"
                  options={['es', 'en']}
                  itemComponent={(itemProps) => (
                    <SelectItem value={itemProps.item.rawValue}>
                      <Show when={itemProps.item.rawValue === 'es'} fallback="English">
                        Espanol
                      </Show>
                    </SelectItem>
                  )}
                >
                  <SelectTrigger class="w-[180px]">
                    <SelectValue placeholder="Selecciona un idioma" />
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </div>
              <div class="flex items-center justify-between">
                <Label for="currency">Moneda</Label>
                <Select<string>
                  defaultValue="eur"
                  options={['eur', 'usd']}
                  itemComponent={(itemProps) => (
                    <SelectItem value={itemProps.item.rawValue}>
                      <Show when={itemProps.item.rawValue === 'eur'} fallback="Dolar ($)">
                        Euro (EUR)
                      </Show>
                    </SelectItem>
                  )}
                >
                  <SelectTrigger class="w-[180px]">
                    <SelectValue placeholder="Selecciona una moneda" />
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </div>

              <div class="pt-4 border-t">
                <Button
                  variant="outline"
                  class="w-full justify-start h-12"
                  onClick={restartOnboarding}
                >
                  <Wand2 class="mr-2 h-4 w-4 text-primary" />
                  Ejecutar Asistente de Configuracion
                </Button>
                <p class="text-[10px] text-muted-foreground mt-2 px-1">
                  Reinicia el asistente para volver a configurar el almacenamiento, importar datos o
                  crear usuarios iniciales.
                </p>
              </div>

              <Show when={state.debugMode}>
                <div class="pt-4 border-t">
                  <DemoDataLoader />
                </div>
              </Show>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Configuracion de Apariencia</CardTitle>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="space-y-3">
                <Label class="text-base font-medium">Control de Tema</Label>
                <p class="text-sm text-muted-foreground">
                  Personaliza la apariencia con diferentes temas de color y modo claro/oscuro.
                </p>
                <div class="border rounded-lg p-4 bg-muted/10">
                  <ThemeSwitcher />
                </div>
              </div>

              <div class="space-y-3 border-t pt-6">
                <Label class="text-base font-medium">Imagenes de Productos</Label>
                <p class="text-sm text-muted-foreground">
                  Configura como se muestran las imagenes de productos sin imagen personalizada.
                </p>
                <div class="flex items-center justify-between p-4 bg-muted/10 rounded-lg">
                  <div class="space-y-1">
                    <Label for="stock-images" class="text-sm font-medium">
                      Usar imagenes stock
                    </Label>
                    <p class="text-xs text-muted-foreground">
                      Mostrar imagenes predefinidas para productos sin imagen personalizada
                    </p>
                  </div>
                  <SwitchUI
                    id="stock-images"
                    checked={state.useStockImages}
                    onChange={setUseStockImages}
                  />
                </div>
              </div>

              <div class="space-y-3 border-t pt-6">
                <Label class="text-base font-medium">Diagnostico de Temas</Label>
                <p class="text-sm text-muted-foreground">
                  Herramienta de depuracion para visualizar variables CSS y estado del tema.
                </p>
                <ThemeDebugger />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="license">
          <LicenseStatusCard
            licenseStatus={state.licenseStatus}
            onRefresh={refreshLicenseStatus}
            onClearLicense={() => {
              invoke('clear_license')
                .then(() => {
                  toast({
                    title: 'Licencia eliminada',
                    description: 'La licencia ha sido eliminada correctamente',
                  });
                  refreshLicenseStatus();
                })
                .catch((error) => {
                  toast({
                    title: 'Error',
                    description: 'No se pudo eliminar la licencia',
                    variant: 'destructive',
                  });
                  console.error('Error clearing license:', error);
                });
            }}
          />
        </TabsContent>

        <TabsContent value="users">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Usuario Actual</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="flex items-center space-x-4 mb-4">
                  <Avatar>
                    <AvatarImage
                      src={props.selectedUser.profilePicture}
                      alt={props.selectedUser.name}
                    />
                    <AvatarFallback>{props.selectedUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span class="text-lg font-semibold">{props.selectedUser.name}</span>
                </div>
                <Button onClick={() => handleEditUser(props.selectedUser)}>
                  <Pencil class="mr-2 h-4 w-4" /> Editar Usuario
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Lista de Usuarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  <For each={props.users}>
                    {(user) => (
                      <div class="flex items-center justify-between p-2 bg-muted rounded">
                        <div class="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src={user.profilePicture} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span class="text-sm font-semibold">{user.name}</span>
                        </div>
                        <div>
                          <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                            <Pencil class="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 class="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
                <Button class="mt-4 w-full" onClick={handleCreateUser}>
                  <PlusCircle class="mr-2 h-4 w-4" /> Crear Nuevo Usuario
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="printing">
          <Card>
            <CardHeader>
              <CardTitle>Configuracion de Impresion</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <ThermalPrinterSettings
                options={props.thermalPrinterOptions}
                onOptionsChange={props.handleThermalPrinterOptionsChange}
                onPrintTestTicket={handlePrintTestTicket}
                onTestConnection={handleTestConnection}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pos">
          <Card>
            <CardHeader>
              <CardTitle>Configuracion del Punto de Venta</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex flex-col space-y-1">
                  <Label for="openCashDrawer">Abrir Caja Registradora</Label>
                  <p class="text-xs text-muted-foreground">
                    Envia el comando de apertura al cajon de efectivo
                  </p>
                </div>
                <Button
                  id="openCashDrawer"
                  onClick={async () => {
                    try {
                      await openCashDrawerOnly();
                      toast({
                        title: 'Caja abierta',
                        description: 'El cajon de efectivo se ha abierto correctamente.',
                        duration: 3000,
                      });
                    } catch (_error) {
                      toast({
                        title: 'Error al abrir caja',
                        description:
                          'No se pudo abrir el cajon. Verifica la conexion de la impresora.',
                        duration: 3000,
                      });
                    }
                  }}
                >
                  <DollarSign class="mr-2 h-4 w-4" /> Abrir Caja
                </Button>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex flex-col space-y-1">
                  <Label for="autoOpenDrawer">Abrir Caja Automaticamente</Label>
                  <p class="text-xs text-muted-foreground">
                    Abre el cajon al completar cada venta en efectivo
                  </p>
                </div>
                <SwitchUI
                  id="autoOpenDrawer"
                  checked={state.autoOpenCashDrawer}
                  onChange={setAutoOpenCashDrawer}
                />
              </div>
              <div class="flex items-center justify-between">
                <div class="flex flex-col space-y-1">
                  <Label for="taxRate">Tasa de Impuestos (%)</Label>
                  <p class="text-xs text-muted-foreground">
                    IVA aplicado en los tickets (Espana: 21%)
                  </p>
                </div>
                <Input
                  id="taxRate"
                  type="number"
                  value={state.taxRate}
                  onInput={(e) => setTaxRate(parseFloat(e.currentTarget.value) || 0)}
                  placeholder="21"
                  class="w-[100px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifactu">
          <AEATSettings />
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Configuracion de Seguridad</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="flex items-center justify-between">
                <Label for="twoFactor">Autenticacion de dos factores</Label>
                <SwitchUI id="twoFactor" />
              </div>
              <div class="flex items-center justify-between">
                <Label for="autoLogout">Cierre de Sesion Automatico (minutos)</Label>
                <Input id="autoLogout" type="number" placeholder="30" class="w-[100px]" />
              </div>
              <Button>
                <ShieldCheck class="mr-2 h-4 w-4" /> Cambiar Contrasena
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Configuracion de Notificaciones</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="flex items-center justify-between">
                <Label for="emailNotifications">Notificaciones por correo</Label>
                <SwitchUI id="emailNotifications" />
              </div>
              <div class="flex items-center justify-between">
                <Label for="pushNotifications">Notificaciones push</Label>
                <SwitchUI id="pushNotifications" />
              </div>
              <div class="flex items-center justify-between">
                <Label for="lowStockAlert">Alerta de Stock Bajo</Label>
                <SwitchUI id="lowStockAlert" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>Acerca de TPV El Haido</CardTitle>
            </CardHeader>
            <CardContent>
              <VersionInfo />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Edit/Create Dialog */}
      <Dialog open={isUserDialogOpen()} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Show when={editingUser()} fallback="Crear Nuevo Usuario">
                Editar Usuario
              </Show>
            </DialogTitle>
          </DialogHeader>
          <div class="space-y-4">
            <div>
              <Label for="name">Nombre</Label>
              <Input
                id="name"
                value={newUser().name}
                onInput={(e) => setNewUser({ ...newUser(), name: e.currentTarget.value })}
              />
            </div>
            <div>
              <Label for="profilePicture">URL de la Imagen de Perfil</Label>
              <Input
                id="profilePicture"
                value={newUser().profilePicture}
                onInput={(e) => setNewUser({ ...newUser(), profilePicture: e.currentTarget.value })}
              />
            </div>
            <div>
              <Label for="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                value={newUser().pin}
                onInput={(e) => setNewUser({ ...newUser(), pin: e.currentTarget.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Storage Mode Confirmation Dialog */}
      <Dialog open={isStorageModeDialogOpen()} onOpenChange={setIsStorageModeDialogOpen}>
        <DialogContent class="bg-background dark:bg-background rounded-lg shadow-xl">
          <DialogHeader>
            <DialogTitle class="text-xl font-semibold text-foreground dark:text-foreground">
              Cambiar modo de almacenamiento?
            </DialogTitle>
            <DialogDescription class="text-muted-foreground dark:text-muted-foreground">
              <Switch>
                <Match when={pendingStorageMode() === 'sqlite'}>
                  Cambiar a <strong>SQLite nativo</strong> usara una base de datos integrada en la
                  aplicacion. Es la opcion mas rapida y funciona completamente sin conexion.
                  Recomendado para uso en produccion.
                </Match>
                <Match when={pendingStorageMode() === 'indexeddb'}>
                  Cambiar a <strong>IndexedDB</strong> almacenara los datos en el navegador. Util
                  para desarrollo web pero los datos se pierden si se limpia el cache del navegador.
                </Match>
                <Match when={pendingStorageMode() === 'http'}>
                  Cambiar a <strong>modo HTTP API</strong> usara la base de datos externa. Requiere
                  conexion al servidor pero permite sincronizacion entre dispositivos.
                </Match>
              </Switch>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelStorageModeChange}
              class="text-foreground dark:text-foreground hover:bg-secondary dark:hover:bg-secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmStorageModeChange}
              class="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Confirmar Cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPanel;
