import { invoke } from '@tauri-apps/api/core';
import {
  Bell,
  Cloud,
  Database,
  DollarSign,
  FileText,
  HardDrive,
  Info,
  Key,
  Lock,
  Palette,
  Pencil,
  PlusCircle,
  Printer,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
  Wand2,
  X,
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
import { createEffect } from 'solid-js';
import {
  openCashDrawerOnly,
  runThermalPrinterCommand,
} from '@/services/thermal-printer.service.ts';
import useStore from '@/store/store';
import type { LicenseStatus } from '@/types/license';
import { cn } from '@/lib/utils';

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
  forceAboutTab?: boolean;
};

const SETTINGS_TABS = [
  { value: 'general', label: 'General', icon: SlidersHorizontal },
  { value: 'appearance', label: 'Apariencia', icon: Palette },
  { value: 'users', label: 'Usuarios', icon: Users },
  { value: 'printing', label: 'Impresión', icon: Printer },
  { value: 'pos', label: 'Punto de Venta', icon: DollarSign },
  { value: 'verifactu', label: 'VERI*FACTU', icon: FileText },
  { value: 'license', label: 'Licencia', icon: Key },
  { value: 'security', label: 'Seguridad', icon: ShieldCheck },
  { value: 'notifications', label: 'Notificaciones', icon: Bell },
  { value: 'about', label: 'Acerca de', icon: Info },
] as const;

const SettingsPanel: Component<SettingsPanelProps> = (props) => {
  const store = useStore();
  const {
    state,
    setStorageMode,
    setUseStockImages,
    setTouchOptimizationsEnabled,
    setAutoOpenCashDrawer,
    setTaxRate,
    setLicenseStatus,
  } = store;
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

  createEffect(() => {
    if (props.forceAboutTab) {
      setActiveTab('about');
    }
  });

  const refreshLicenseStatus = async () => {
    try {
      const status = await invoke('check_license_status');
      setLicenseStatus(status as LicenseStatus);
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

  const handleSaveUser = async () => {
    const editing = editingUser();
    const updatedUser = { ...newUser() } as User;

    if (editing) {
      const userToSave = { ...updatedUser, id: editing.id };
      const result = await store.storageAdapter().updateUser(userToSave);
      if (result.ok) {
        props.setUsers(props.users.map((u) => (u.id === editing.id ? userToSave : u)));
        if (props.selectedUser.id === editing.id) {
          props.setSelectedUser(userToSave);
        }
        toast({
          title: 'Usuario actualizado',
          description: `Usuario "${userToSave.name}" actualizado correctamente.`,
        });
      } else {
        toast({
          title: 'Error al actualizar usuario',
          description: result.error.message,
          variant: 'destructive',
        });
      }
    } else {
      const newId = Math.max(...props.users.map((u) => u.id), 0) + 1;
      const userToCreate = { ...updatedUser, id: newId };
      const result = await store.storageAdapter().createUser(userToCreate);
      if (result.ok) {
        props.setUsers([...props.users, userToCreate]);
        toast({
          title: 'Usuario creado',
          description: `Usuario "${userToCreate.name}" creado correctamente.`,
        });
      } else {
        toast({
          title: 'Error al crear usuario',
          description: result.error.message,
          variant: 'destructive',
        });
      }
    }
    setIsUserDialogOpen(false);
  };

  const handleDeleteUser = async (userId: number) => {
    const userToDelete = props.users.find((u) => u.id === userId);
    if (!userToDelete) return;

    const result = await store.storageAdapter().deleteUser(userToDelete);
    if (result.ok) {
      props.setUsers(props.users.filter((u) => u.id !== userId));
      if (props.selectedUser.id === userId) {
        const remainingUsers = props.users.filter((u) => u.id !== userId);
        props.setSelectedUser(remainingUsers[0] || null);
      }
      toast({
        title: 'Usuario eliminado',
        description: `Usuario "${userToDelete.name}" eliminado correctamente.`,
      });
    } else {
      toast({
        title: 'Error al eliminar usuario',
        description: result.error.message,
        variant: 'destructive',
      });
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
    <div class="space-y-6 bg-background text-foreground max-w-6xl mx-auto px-4">
      <Tabs value={activeTab()} onChange={setActiveTab} class="w-full">
        <div class="relative">
          <div class="pb-2">
            <TabsList class="flex flex-wrap h-auto bg-muted/40 border border-border/50 p-1.5 gap-1 rounded-xl backdrop-blur-sm">
              <For each={SETTINGS_TABS}>
                {(tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      value={tab.value}
                      class={cn(
                        'relative px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                        'data-[state=active]:bg-background data-[state=active]:shadow-sm',
                        'data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground',
                        'data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/50',
                        'flex items-center gap-2 min-w-fit'
                      )}
                    >
                      <Icon class="h-4 w-4" />
                      <span class="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  );
                }}
              </For>
            </TabsList>
          </div>
        </div>

        <div class="mt-6">
          <TabsContent value="general" class="space-y-4">
            <Card class="border-border/50 shadow-sm">
              <CardHeader class="border-b border-border/50">
                <CardTitle class="flex items-center gap-2 text-lg">
                  <SlidersHorizontal class="h-5 w-5 text-primary" />
                  Configuración General
                </CardTitle>
              </CardHeader>
              <CardContent class="p-6 space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-4">
                    <div class="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/30">
                      <div class="space-y-0.5">
                        <Label for="darkMode" class="text-sm font-medium">
                          Modo Oscuro
                        </Label>
                        <p class="text-xs text-muted-foreground">
                          Alternar tema claro/oscuro
                        </p>
                      </div>
                      <SwitchUI
                        id="darkMode"
                        checked={props.isDarkMode}
                        onChange={props.toggleDarkMode}
                      />
                    </div>

                    <div class="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/30">
                      <div class="space-y-0.5">
                        <Label for="touchOptimizations" class="text-sm font-medium">
                          Optimizaciones Táctiles
                        </Label>
                        <p class="text-xs text-muted-foreground">
                          Mejora respuesta en pantallas táctiles
                        </p>
                      </div>
                      <SwitchUI
                        id="touchOptimizations"
                        checked={state.touchOptimizationsEnabled}
                        onChange={setTouchOptimizationsEnabled}
                      />
                    </div>
                  </div>

                  <div class="space-y-4">
                    <div class="space-y-2">
                      <Label for="language" class="text-sm font-medium">
                        Idioma
                      </Label>
                      <Select<string> defaultValue="es" options={['es', 'en']}>
                        <SelectTrigger class="w-full">
                          <SelectValue placeholder="Selecciona un idioma" />
                        </SelectTrigger>
                        <SelectContent />
                      </Select>
                    </div>

                    <div class="space-y-2">
                      <Label for="currency" class="text-sm font-medium">
                        Moneda
                      </Label>
                      <Select<string> defaultValue="eur" options={['eur', 'usd']}>
                        <SelectTrigger class="w-full">
                          <SelectValue placeholder="Selecciona una moneda" />
                        </SelectTrigger>
                        <SelectContent />
                      </Select>
                    </div>
                  </div>
                </div>

                <div class="space-y-3 pt-4 border-t border-border/50">
                  <div class="flex items-center justify-between">
                    <div class="space-y-1">
                      <Label for="storageMode" class="text-sm font-medium">
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
                      <SelectTrigger class="w-[200px]">
                        <SelectValue placeholder="Selecciona modo" />
                      </SelectTrigger>
                      <SelectContent />
                    </Select>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/20 rounded-lg border border-border/20">
                    <div class="flex items-start gap-2">
                      <HardDrive class="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div class="space-y-0.5">
                        <p class="text-xs font-medium">SQLite</p>
                        <p class="text-[10px] text-muted-foreground">
                          Nativa, mejor rendimiento, sin conexión
                        </p>
                      </div>
                    </div>
                    <div class="flex items-start gap-2">
                      <Cloud class="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div class="space-y-0.5">
                        <p class="text-xs font-medium">HTTP API</p>
                        <p class="text-[10px] text-muted-foreground">
                          Centralizados, requiere servidor
                        </p>
                      </div>
                    </div>
                    <div class="flex items-start gap-2">
                      <Database class="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div class="space-y-0.5">
                        <p class="text-xs font-medium">IndexedDB</p>
                        <p class="text-[10px] text-muted-foreground">
                          Navegador, fallback desarrollo
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="pt-4 border-t border-border/50 space-y-3">
                  <Button
                    variant="outline"
                    class="w-full justify-start h-11 gap-2"
                    onClick={restartOnboarding}
                  >
                    <Wand2 class="h-4 w-4 text-primary" />
                    <span>Ejecutar Asistente de Configuración</span>
                  </Button>
                  <p class="text-xs text-muted-foreground px-1">
                    Reinicia el asistente para volver a configurar el almacenamiento, importar datos o
                    crear usuarios iniciales.
                  </p>
                </div>

                <Show when={state.debugMode}>
                  <div class="pt-4 border-t border-border/50">
                    <DemoDataLoader />
                  </div>
                </Show>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" class="space-y-4">
            <Card class="border-border/50 shadow-sm">
              <CardHeader class="border-b border-border/50">
                <CardTitle class="flex items-center gap-2 text-lg">
                  <Palette class="h-5 w-5 text-primary" />
                  Configuración de Apariencia
                </CardTitle>
              </CardHeader>
              <CardContent class="p-6 space-y-6">
                <div class="space-y-4">
                  <div class="space-y-2">
                    <Label class="text-sm font-medium">Control de Tema</Label>
                    <p class="text-xs text-muted-foreground">
                      Personaliza la apariencia con diferentes temas de color y modo claro/oscuro.
                    </p>
                  </div>
                  <div class="p-5 bg-muted/30 rounded-lg border border-border/30">
                    <ThemeSwitcher />
                  </div>
                </div>

                <div class="space-y-4 pt-4 border-t border-border/50">
                  <div class="space-y-2">
                    <Label class="text-sm font-medium">Imágenes de Productos</Label>
                    <p class="text-xs text-muted-foreground">
                      Configura como se muestran las imágenes de productos sin imagen personalizada.
                    </p>
                  </div>
                  <div class="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/30">
                    <div class="space-y-0.5">
                      <Label for="stock-images" class="text-sm font-medium">
                        Usar imágenes stock
                      </Label>
                      <p class="text-xs text-muted-foreground">
                        Mostrar imágenes predefinidas para productos sin imagen personalizada
                      </p>
                    </div>
                    <SwitchUI
                      id="stock-images"
                      checked={state.useStockImages}
                      onChange={setUseStockImages}
                    />
                  </div>
                </div>

                <div class="space-y-4 pt-4 border-t border-border/50">
                  <div class="space-y-2">
                    <Label class="text-sm font-medium">Diagnóstico de Temas</Label>
                    <p class="text-xs text-muted-foreground">
                      Herramienta de depuración para visualizar variables CSS y estado del tema.
                    </p>
                  </div>
                  <div class="p-4 bg-muted/20 rounded-lg border border-border/20">
                    <ThemeDebugger />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="license" class="space-y-4">
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

          <TabsContent value="users" class="space-y-4">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card class="border-border/50 shadow-sm">
                <CardHeader class="border-b border-border/50">
                  <CardTitle class="flex items-center gap-2 text-lg">
                    <Users class="h-5 w-5 text-primary" />
                    Usuario Actual
                  </CardTitle>
                </CardHeader>
                <CardContent class="p-6 space-y-4">
                  <div class="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                    <Avatar class="h-16 w-16">
                      <AvatarImage
                        src={props.selectedUser.profilePicture}
                        alt={props.selectedUser.name}
                      />
                      <AvatarFallback class="text-lg">
                        {props.selectedUser.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div class="space-y-1">
                      <p class="text-base font-semibold">{props.selectedUser.name}</p>
                      <p class="text-xs text-muted-foreground">Usuario actual</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleEditUser(props.selectedUser)}
                    class="w-full gap-2"
                  >
                    <Pencil class="h-4 w-4" />
                    Editar Usuario
                  </Button>
                </CardContent>
              </Card>

              <Card class="border-border/50 shadow-sm">
                <CardHeader class="border-b border-border/50">
                  <CardTitle class="flex items-center gap-2 text-lg">
                    <Users class="h-5 w-5 text-primary" />
                    Lista de Usuarios
                  </CardTitle>
                </CardHeader>
                <CardContent class="p-6 space-y-4">
                  <div class="space-y-2 max-h-[300px] overflow-y-auto">
                    <For each={props.users}>
                      {(user) => (
                        <div class="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/20 hover:bg-muted/30 transition-colors">
                          <div class="flex items-center gap-3">
                            <Avatar class="h-10 w-10">
                              <AvatarImage src={user.profilePicture} alt={user.name} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span class="text-sm font-medium">{user.name}</span>
                          </div>
                          <div class="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              class="h-8 w-8"
                              onClick={() => handleEditUser(user)}
                            >
                              <Pencil class="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              class="h-8 w-8 hover:text-destructive"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 class="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                  <Button onClick={handleCreateUser} class="w-full gap-2">
                    <PlusCircle class="h-4 w-4" />
                    Crear Nuevo Usuario
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="printing" class="space-y-4">
            <Card class="border-border/50 shadow-sm">
              <CardHeader class="border-b border-border/50">
                <CardTitle class="flex items-center gap-2 text-lg">
                  <Printer class="h-5 w-5 text-primary" />
                  Configuración de Impresión
                </CardTitle>
              </CardHeader>
              <CardContent class="p-6 space-y-4">
                <ThermalPrinterSettings
                  options={props.thermalPrinterOptions}
                  onOptionsChange={props.handleThermalPrinterOptionsChange}
                  onPrintTestTicket={handlePrintTestTicket}
                  onTestConnection={handleTestConnection}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pos" class="space-y-4">
            <Card class="border-border/50 shadow-sm">
              <CardHeader class="border-b border-border/50">
                <CardTitle class="flex items-center gap-2 text-lg">
                  <DollarSign class="h-5 w-5 text-primary" />
                  Configuración del Punto de Venta
                </CardTitle>
              </CardHeader>
              <CardContent class="p-6 space-y-6">
                <div class="space-y-4">
                  <div class="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/30">
                    <div class="space-y-0.5">
                      <Label for="autoOpenDrawer" class="text-sm font-medium">
                        Abrir Caja Automáticamente
                      </Label>
                      <p class="text-xs text-muted-foreground">
                        Abre el cajón al completar cada venta en efectivo
                      </p>
                    </div>
                    <SwitchUI
                      id="autoOpenDrawer"
                      checked={state.autoOpenCashDrawer}
                      onChange={setAutoOpenCashDrawer}
                    />
                  </div>

                  <div class="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/30">
                    <div class="space-y-0.5">
                      <Label for="taxRate" class="text-sm font-medium">
                        Tasa de Impuestos (%)
                      </Label>
                      <p class="text-xs text-muted-foreground">
                        IVA aplicado en los tickets (España: 21%)
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
                </div>

                <div class="pt-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    class="w-full gap-2"
                    onClick={() => {
                      const openCashDrawer = async () => {
                        try {
                          await openCashDrawerOnly();
                          toast({
                            title: 'Caja abierta',
                            description: 'El cajón de efectivo se ha abierto correctamente.',
                            duration: 3000,
                          });
                        } catch (_error) {
                          toast({
                            title: 'Error al abrir caja',
                            description:
                              'No se pudo abrir el cajón. Verifica la conexión de la impresora.',
                            duration: 3000,
                          });
                        }
                      };
                      void openCashDrawer();
                    }}
                  >
                    <DollarSign class="h-4 w-4" />
                    Abrir Caja Manualmente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verifactu" class="space-y-4">
            <AEATSettings />
          </TabsContent>

          <TabsContent value="security" class="space-y-4">
            <Card class="border-border/50 shadow-sm">
              <CardHeader class="border-b border-border/50">
                <CardTitle class="flex items-center gap-2 text-lg">
                  <ShieldCheck class="h-5 w-5 text-primary" />
                  Configuración de Seguridad
                </CardTitle>
              </CardHeader>
              <CardContent class="p-6 space-y-6">
                <div class="space-y-4">
                  <div class="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/30">
                    <div class="space-y-0.5">
                      <Label for="twoFactor" class="text-sm font-medium">
                        Autenticación de dos factores
                      </Label>
                      <p class="text-xs text-muted-foreground">
                        Añade una capa adicional de seguridad
                      </p>
                    </div>
                    <SwitchUI id="twoFactor" />
                  </div>

                  <div class="space-y-2">
                    <Label for="autoLogout" class="text-sm font-medium">
                      Cierre de Sesión Automático (minutos)
                    </Label>
                    <Input
                      id="autoLogout"
                      type="number"
                      placeholder="30"
                      class="w-full"
                    />
                    <p class="text-xs text-muted-foreground">
                      Tiempo de inactividad antes de cerrar sesión automáticamente
                    </p>
                  </div>
                </div>

                <div class="pt-4 border-t border-border/50">
                  <Button variant="outline" class="w-full gap-2">
                    <Lock class="h-4 w-4" />
                    Cambiar Contraseña
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" class="space-y-4">
            <Card class="border-border/50 shadow-sm">
              <CardHeader class="border-b border-border/50">
                <CardTitle class="flex items-center gap-2 text-lg">
                  <Bell class="h-5 w-5 text-primary" />
                  Configuración de Notificaciones
                </CardTitle>
              </CardHeader>
              <CardContent class="p-6 space-y-4">
                <div class="space-y-3">
                  <div class="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/30">
                    <div class="space-y-0.5">
                      <Label for="emailNotifications" class="text-sm font-medium">
                        Notificaciones por correo
                      </Label>
                      <p class="text-xs text-muted-foreground">
                        Recibe alertas y resúmenes en tu email
                      </p>
                    </div>
                    <SwitchUI id="emailNotifications" />
                  </div>

                  <div class="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/30">
                    <div class="space-y-0.5">
                      <Label for="pushNotifications" class="text-sm font-medium">
                        Notificaciones push
                      </Label>
                      <p class="text-xs text-muted-foreground">
                        Alertas en tiempo real en tu dispositivo
                      </p>
                    </div>
                    <SwitchUI id="pushNotifications" />
                  </div>

                  <div class="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/30">
                    <div class="space-y-0.5">
                      <Label for="lowStockAlert" class="text-sm font-medium">
                        Alerta de Stock Bajo
                      </Label>
                      <p class="text-xs text-muted-foreground">
                        Notificación cuando un producto tenga poco stock
                      </p>
                    </div>
                    <SwitchUI id="lowStockAlert" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" class="space-y-4">
            <Card class="border-border/50 shadow-sm">
              <CardHeader class="border-b border-border/50">
                <CardTitle class="flex items-center gap-2 text-lg">
                  <Info class="h-5 w-5 text-primary" />
                  Acerca de TPV El Haido
                </CardTitle>
              </CardHeader>
              <CardContent class="p-6">
                <VersionInfo />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={isUserDialogOpen()} onOpenChange={setIsUserDialogOpen}>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2">
              <Users class="h-5 w-5 text-primary" />
              <Show when={editingUser()} fallback="Crear Nuevo Usuario">
                Editar Usuario
              </Show>
            </DialogTitle>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="name" class="text-sm font-medium">Nombre</Label>
              <Input
                id="name"
                value={newUser().name}
                onInput={(e) => setNewUser({ ...newUser(), name: e.currentTarget.value })}
                placeholder="Nombre del usuario"
              />
            </div>
            <div class="space-y-2">
              <Label for="profilePicture" class="text-sm font-medium">
                URL de la Imagen de Perfil
              </Label>
              <Input
                id="profilePicture"
                value={newUser().profilePicture}
                onInput={(e) => setNewUser({ ...newUser(), profilePicture: e.currentTarget.value })}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>
            <div class="space-y-2">
              <Label for="pin" class="text-sm font-medium">PIN</Label>
              <Input
                id="pin"
                type="password"
                value={newUser().pin}
                onInput={(e) => setNewUser({ ...newUser(), pin: e.currentTarget.value })}
                placeholder="****"
                maxlength={4}
              />
            </div>
          </div>
          <DialogFooter class="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsUserDialogOpen(false)}
              class="flex-1"
            >
              <X class="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} class="flex-1">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStorageModeDialogOpen()} onOpenChange={setIsStorageModeDialogOpen}>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2 text-lg">
              <Database class="h-5 w-5 text-primary" />
              Cambiar modo de almacenamiento?
            </DialogTitle>
          </DialogHeader>
          <div class="py-4">
            <p class="text-sm text-muted-foreground leading-relaxed">
              <Switch>
                <Match when={pendingStorageMode() === 'sqlite'}>
                  Cambiar a <strong>SQLite nativo</strong> usará una base de datos integrada en la
                  aplicación. Es la opción más rápida y funciona completamente sin conexión.
                  Recomendado para uso en producción.
                </Match>
                <Match when={pendingStorageMode() === 'indexeddb'}>
                  Cambiar a <strong>IndexedDB</strong> almacenará los datos en el navegador. Util
                  para desarrollo web pero los datos se pierden si se limpia el cache del navegador.
                </Match>
                <Match when={pendingStorageMode() === 'http'}>
                  Cambiar a <strong>modo HTTP API</strong> usará la base de datos externa. Requiere
                  conexión al servidor pero permite sincronización entre dispositivos.
                </Match>
              </Switch>
            </p>
          </div>
          <DialogFooter class="gap-2">
            <Button
              variant="outline"
              onClick={cancelStorageModeChange}
              class="flex-1"
            >
              <X class="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={confirmStorageModeChange}
              class="flex-1"
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
