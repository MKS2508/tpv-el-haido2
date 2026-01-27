import {
  Cloud,
  Database,
  DollarSign,
  HardDrive,
  Pencil,
  PlusCircle,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
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
import { Switch } from '@/components/ui/switch.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { toast } from '@/components/ui/use-toast.ts';
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

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  selectedUser,
  setSelectedUser,
  users,
  setUsers,
  isSidebarOpen,
  isDarkMode,
  toggleDarkMode,
  thermalPrinterOptions,
  handleThermalPrinterOptionsChange,
}) => {
  const {
    storageMode,
    setStorageMode,
    useStockImages,
    setUseStockImages,
    touchOptimizationsEnabled,
    setTouchOptimizationsEnabled,
    autoOpenCashDrawer,
    setAutoOpenCashDrawer,
    taxRate,
    setTaxRate,
  } = useStore();
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({ name: '', profilePicture: '', pin: '' });
  const [activeTab, setActiveTab] = useState('general');
  const [isStorageModeDialogOpen, setIsStorageModeDialogOpen] = useState(false);
  const [pendingStorageMode, setPendingStorageMode] = useState<StorageMode | null>(null);

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
    if (editingUser) {
      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, ...newUser } : u)));
      if (selectedUser.id === editingUser.id) {
        setSelectedUser({ ...selectedUser, ...newUser } as User);
      }
    } else {
      const newId = Math.max(...users.map((u) => u.id)) + 1;
      setUsers([...users, { ...(newUser as User), id: newId }]);
    }
    setIsUserDialogOpen(false);
  };

  const handleDeleteUser = (userId: number) => {
    setUsers(users.filter((u) => u.id !== userId));
    if (selectedUser.id === userId) {
      setSelectedUser(users.find((u) => u.id !== userId) || users[0]);
    }
  };

  async function handlePrintTestTicket() {
    // Ejemplo de uso
    let result = '';
    try {
      result = await runThermalPrinterCommand('isConnected,execute,raw(Hello World)');
      console.log('Printer command result:', result);
      if (result.indexOf('Error') !== -1 || result.indexOf('error') !== -1) {
        toast({
          title: 'Error al imprimir ticket',
          description: 'No se pudo imprimir el ticket. Por favor, inténtelo de nuevo.',
          duration: 3000,
        });
      } else {
        toast({
          title: 'Ticket impreso',
          description: 'Ticket impreso con éxito.',
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
        title: 'Conexión exitosa',
        description: 'La conexión se ha establecido con éxito.',
        duration: 3000,
      });
    } else {
      toast({
        title: 'Error de conexión',
        description:
          'No se ha podido establecer la conexión. Por favor, revise los ajustes de la impresora.',
        duration: 3000,
      });
    }
    return result;
  };

  const handleStorageModeToggle = (newMode: StorageMode) => {
    if (newMode !== storageMode) {
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
    if (pendingStorageMode) {
      setStorageMode(pendingStorageMode);
      // Persist the setting
      localStorage.setItem('tpv-storage-mode', pendingStorageMode);

      toast({
        title: 'Modo de almacenamiento cambiado',
        description: `Ahora usando ${getStorageModeDescription(pendingStorageMode)}`,
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
  useEffect(() => {
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
  }, [setStorageMode, setTouchOptimizationsEnabled]);

  return (
    <div className={`space-y-0 p-0 ${isSidebarOpen ? 'ml-1' : ''} bg-background text-foreground`}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-0">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Apariencia</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="printing">Impresión</TabsTrigger>
          <TabsTrigger value="pos">Punto de Venta</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="darkMode">Modo Oscuro</Label>
                <Switch id="darkMode" checked={isDarkMode} onCheckedChange={toggleDarkMode} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="touchOptimizations">Optimizaciones Táctiles</Label>
                <Switch
                  id="touchOptimizations"
                  checked={touchOptimizationsEnabled}
                  onCheckedChange={setTouchOptimizationsEnabled}
                />
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <Label htmlFor="storageMode" className="font-medium">
                      Modo de Almacenamiento
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {storageMode === 'sqlite' && 'SQLite integrado (recomendado)'}
                      {storageMode === 'http' && 'Base de datos externa HTTP'}
                      {storageMode === 'indexeddb' && 'IndexedDB local (navegador)'}
                    </p>
                  </div>
                  <Select
                    value={storageMode}
                    onValueChange={(value) => handleStorageModeToggle(value as StorageMode)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Selecciona modo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sqlite">
                        <span className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4" />
                          SQLite (Nativo)
                        </span>
                      </SelectItem>
                      <SelectItem value="http">
                        <span className="flex items-center gap-2">
                          <Cloud className="h-4 w-4" />
                          HTTP API
                        </span>
                      </SelectItem>
                      <SelectItem value="indexeddb">
                        <span className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          IndexedDB
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded space-y-1">
                  <div>
                    <strong>
                      <HardDrive className="h-3 w-3 inline mr-1" />
                      SQLite:
                    </strong>{' '}
                    Base de datos nativa, mejor rendimiento, funciona sin conexión
                  </div>
                  <div>
                    <strong>
                      <Cloud className="h-3 w-3 inline mr-1" />
                      HTTP API:
                    </strong>{' '}
                    Datos centralizados, requiere servidor externo
                  </div>
                  <div>
                    <strong>
                      <Database className="h-3 w-3 inline mr-1" />
                      IndexedDB:
                    </strong>{' '}
                    Almacenamiento del navegador, fallback para desarrollo
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="language">Idioma</Label>
                <Select defaultValue="es">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecciona un idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="currency">Moneda</Label>
                <Select defaultValue="eur">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecciona una moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eur">Euro (€)</SelectItem>
                    <SelectItem value="usd">Dólar ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Apariencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">Control de Tema</Label>
                <p className="text-sm text-muted-foreground">
                  Personaliza la apariencia con diferentes temas de color y modo claro/oscuro.
                </p>
                <div className="border rounded-lg p-4 bg-muted/10">
                  <ThemeSwitcher />
                </div>
              </div>

              <div className="space-y-3 border-t pt-6">
                <Label className="text-base font-medium">Imágenes de Productos</Label>
                <p className="text-sm text-muted-foreground">
                  Configura cómo se muestran las imágenes de productos sin imagen personalizada.
                </p>
                <div className="flex items-center justify-between p-4 bg-muted/10 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="stock-images" className="text-sm font-medium">
                      Usar imágenes stock
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Mostrar imágenes predefinidas para productos sin imagen personalizada
                    </p>
                  </div>
                  <Switch
                    id="stock-images"
                    checked={useStockImages}
                    onCheckedChange={setUseStockImages}
                  />
                </div>
              </div>

              <div className="space-y-3 border-t pt-6">
                <Label className="text-base font-medium">Diagnóstico de Temas</Label>
                <p className="text-sm text-muted-foreground">
                  Herramienta de depuración para visualizar variables CSS y estado del tema.
                </p>
                <ThemeDebugger />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Usuario Actual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  <Avatar>
                    <AvatarImage src={selectedUser.profilePicture} alt={selectedUser.name} />
                    <AvatarFallback>{selectedUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-lg font-semibold">{selectedUser.name}</span>
                </div>
                <Button onClick={() => handleEditUser(selectedUser)}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar Usuario
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Lista de Usuarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={user.profilePicture} alt={user.name} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold">{user.name}</span>
                      </div>
                      <div>
                        <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="mt-4 w-full" onClick={handleCreateUser}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Usuario
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="printing">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Impresión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ThermalPrinterSettings
                options={thermalPrinterOptions}
                onOptionsChange={handleThermalPrinterOptionsChange}
                onPrintTestTicket={handlePrintTestTicket}
                onTestConnection={handleTestConnection}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pos">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Punto de Venta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="openCashDrawer">Abrir Caja Registradora</Label>
                  <p className="text-xs text-muted-foreground">
                    Envía el comando de apertura al cajón de efectivo
                  </p>
                </div>
                <Button
                  id="openCashDrawer"
                  onClick={async () => {
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
                  }}
                >
                  <DollarSign className="mr-2 h-4 w-4" /> Abrir Caja
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="autoOpenDrawer">Abrir Caja Automáticamente</Label>
                  <p className="text-xs text-muted-foreground">
                    Abre el cajón al completar cada venta en efectivo
                  </p>
                </div>
                <Switch
                  id="autoOpenDrawer"
                  checked={autoOpenCashDrawer}
                  onCheckedChange={setAutoOpenCashDrawer}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="taxRate">Tasa de Impuestos (%)</Label>
                  <p className="text-xs text-muted-foreground">
                    IVA aplicado en los tickets (España: 21%)
                  </p>
                </div>
                <Input
                  id="taxRate"
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  placeholder="21"
                  className="w-[100px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Seguridad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="twoFactor">Autenticación de dos factores</Label>
                <Switch id="twoFactor" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="autoLogout">Cierre de Sesión Automático (minutos)</Label>
                <Input id="autoLogout" type="number" placeholder="30" className="w-[100px]" />
              </div>
              <Button>
                <ShieldCheck className="mr-2 h-4 w-4" /> Cambiar Contraseña
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Notificaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="emailNotifications">Notificaciones por correo</Label>
                <Switch id="emailNotifications" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="pushNotifications">Notificaciones push</Label>
                <Switch id="pushNotifications" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="lowStockAlert">Alerta de Stock Bajo</Label>
                <Switch id="lowStockAlert" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="profilePicture">URL de la Imagen de Perfil</Label>
              <Input
                id="profilePicture"
                value={newUser.profilePicture}
                onChange={(e) => setNewUser({ ...newUser, profilePicture: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                value={newUser.pin}
                onChange={(e) => setNewUser({ ...newUser, pin: e.target.value })}
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
      <Dialog open={isStorageModeDialogOpen} onOpenChange={setIsStorageModeDialogOpen}>
        <DialogContent className="bg-background dark:bg-background rounded-lg shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground dark:text-foreground">
              ¿Cambiar modo de almacenamiento?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-muted-foreground">
              {pendingStorageMode === 'sqlite' && (
                <>
                  Cambiar a <strong>SQLite nativo</strong> usará una base de datos integrada en la
                  aplicación. Es la opción más rápida y funciona completamente sin conexión.
                  Recomendado para uso en producción.
                </>
              )}
              {pendingStorageMode === 'indexeddb' && (
                <>
                  Cambiar a <strong>IndexedDB</strong> almacenará los datos en el navegador. Útil
                  para desarrollo web pero los datos se pierden si se limpia el cache del navegador.
                </>
              )}
              {pendingStorageMode === 'http' && (
                <>
                  Cambiar a <strong>modo HTTP API</strong> usará la base de datos externa. Requiere
                  conexión al servidor pero permite sincronización entre dispositivos.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelStorageModeChange}
              className="text-foreground dark:text-foreground hover:bg-secondary dark:hover:bg-secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmStorageModeChange}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
