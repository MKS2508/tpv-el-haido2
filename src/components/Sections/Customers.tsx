import {
  Building2,
  FileText,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UsersIcon,
} from 'lucide-solid';
import { createMemo, createSignal, For, Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type Customer from '@/models/Customer';
import useStore from '@/store/store';

function Customers() {
  const store = useStore();

  const [searchTerm, setSearchTerm] = createSignal('');
  const [isDialogOpen, setIsDialogOpen] = createSignal(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = createSignal(false);
  const [editingCustomer, setEditingCustomer] = createSignal<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = createSignal<Customer | null>(null);

  // Form state
  const [formData, setFormData] = createSignal<Partial<Customer>>({
    cifNif: '',
    nombreFiscal: '',
    nombreComercial: '',
    direccion: '',
    codigoPostal: '',
    poblacion: '',
    telefono: '',
    email: '',
    activo: true,
  });

  const filteredCustomers = createMemo(() => {
    const term = searchTerm().toLowerCase();
    if (!term) return store.state.customers;
    return store.state.customers.filter(
      (customer) =>
        customer.nombreFiscal.toLowerCase().includes(term) ||
        customer.nombreComercial.toLowerCase().includes(term) ||
        customer.cifNif.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term)
    );
  });

  const resetForm = () => {
    setFormData({
      cifNif: '',
      nombreFiscal: '',
      nombreComercial: '',
      direccion: '',
      codigoPostal: '',
      poblacion: '',
      telefono: '',
      email: '',
      activo: true,
    });
    setEditingCustomer(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({ ...customer });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    const data = formData();
    const editing = editingCustomer();

    if (editing) {
      // Update existing customer
      const updatedCustomer: Customer = {
        ...editing,
        ...data,
        updatedAt: new Date().toISOString(),
      } as Customer;
      await store.updateCustomer(updatedCustomer);
    } else {
      // Create new customer
      const newCustomer: Customer = {
        id: Date.now(),
        cifNif: data.cifNif || '',
        nombreFiscal: data.nombreFiscal || '',
        nombreComercial: data.nombreComercial || '',
        direccion: data.direccion || '',
        codigoPostal: data.codigoPostal || '',
        poblacion: data.poblacion || '',
        telefono: data.telefono || '',
        email: data.email || '',
        activo: data.activo ?? true,
        createdAt: new Date().toISOString(),
      };
      await store.addCustomer(newCustomer);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    const customer = customerToDelete();
    if (customer) {
      await store.deleteCustomer(customer.id);
    }
    setIsDeleteDialogOpen(false);
    setCustomerToDelete(null);
  };

  const updateFormField = (field: keyof Customer, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div class="flex flex-col h-full space-y-4 p-4">
      {/* Header */}
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div class="relative flex-1 w-full sm:max-w-md">
          <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, CIF/NIF o email..."
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.currentTarget.value)}
            class="pl-10"
          />
        </div>
        <Button onClick={openCreateDialog}>
          <PlusIcon class="mr-2 h-4 w-4" />
          Añadir Cliente
        </Button>
      </div>

      {/* Table */}
      <div class="flex-1 overflow-auto rounded-lg border border-border">
        <Show
          when={filteredCustomers().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
              <div class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-6">
                <UsersIcon class="h-10 w-10 text-primary" />
              </div>
              <h3 class="text-xl font-semibold text-foreground mb-2">
                {searchTerm() ? 'Sin resultados' : 'Gestión de Clientes'}
              </h3>
              <p class="text-muted-foreground max-w-md mb-6">
                {searchTerm()
                  ? `No se encontraron clientes que coincidan con "${searchTerm()}"`
                  : 'Registra a tus clientes para asociarlos a facturas y llevar un control de sus datos fiscales.'}
              </p>
              <Show when={!searchTerm()}>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 w-full max-w-lg">
                  <div class="flex flex-col items-center p-4 rounded-lg bg-muted/50 border border-border">
                    <Building2 class="h-6 w-6 text-muted-foreground mb-2" />
                    <span class="text-xs text-muted-foreground text-center">Datos Fiscales</span>
                  </div>
                  <div class="flex flex-col items-center p-4 rounded-lg bg-muted/50 border border-border">
                    <FileText class="h-6 w-6 text-muted-foreground mb-2" />
                    <span class="text-xs text-muted-foreground text-center">Facturación</span>
                  </div>
                  <div class="flex flex-col items-center p-4 rounded-lg bg-muted/50 border border-border">
                    <UsersIcon class="h-6 w-6 text-muted-foreground mb-2" />
                    <span class="text-xs text-muted-foreground text-center">Contacto</span>
                  </div>
                </div>
                <Button onClick={openCreateDialog} size="lg">
                  <PlusIcon class="mr-2 h-5 w-5" />
                  Añadir Primer Cliente
                </Button>
              </Show>
            </div>
          }
        >
          <table class="w-full caption-bottom text-sm">
            <thead class="[&_tr]:border-b bg-muted/50">
              <tr class="border-b transition-colors">
                <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  CIF/NIF
                </th>
                <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Nombre Fiscal
                </th>
                <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell">
                  Nombre Comercial
                </th>
                <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden lg:table-cell">
                  Teléfono
                </th>
                <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden lg:table-cell">
                  Email
                </th>
                <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  Estado
                </th>
                <th class="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="[&_tr:last-child]:border-0">
              <For each={filteredCustomers()}>
                {(customer) => (
                  <tr class="border-b transition-colors hover:bg-muted/50">
                    <td class="p-4 align-middle font-mono text-sm">{customer.cifNif}</td>
                    <td class="p-4 align-middle font-medium">{customer.nombreFiscal}</td>
                    <td class="p-4 align-middle hidden md:table-cell text-muted-foreground">
                      {customer.nombreComercial || '-'}
                    </td>
                    <td class="p-4 align-middle hidden lg:table-cell">
                      {customer.telefono || '-'}
                    </td>
                    <td class="p-4 align-middle hidden lg:table-cell text-muted-foreground">
                      {customer.email || '-'}
                    </td>
                    <td class="p-4 align-middle">
                      <span
                        class={cn(
                          'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                          customer.activo
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        )}
                      >
                        {customer.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td class="p-4 align-middle text-right">
                      <div class="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(customer)}
                        >
                          <PencilIcon class="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(customer)}
                        >
                          <TrashIcon class="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen()} onOpenChange={setIsDialogOpen}>
        <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer() ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
            <DialogDescription>
              {editingCustomer()
                ? 'Modifica los datos del cliente'
                : 'Introduce los datos del nuevo cliente'}
            </DialogDescription>
          </DialogHeader>

          <div class="grid gap-4 py-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-sm font-medium">CIF/NIF *</label>
                <Input
                  value={formData().cifNif || ''}
                  onInput={(e) => updateFormField('cifNif', e.currentTarget.value)}
                  placeholder="B12345678"
                />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium">Nombre Fiscal *</label>
                <Input
                  value={formData().nombreFiscal || ''}
                  onInput={(e) => updateFormField('nombreFiscal', e.currentTarget.value)}
                  placeholder="Empresa S.L."
                />
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium">Nombre Comercial</label>
              <Input
                value={formData().nombreComercial || ''}
                onInput={(e) => updateFormField('nombreComercial', e.currentTarget.value)}
                placeholder="Nombre comercial (opcional)"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium">Dirección</label>
              <Input
                value={formData().direccion || ''}
                onInput={(e) => updateFormField('direccion', e.currentTarget.value)}
                placeholder="Calle, número, piso..."
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-sm font-medium">Código Postal</label>
                <Input
                  value={formData().codigoPostal || ''}
                  onInput={(e) => updateFormField('codigoPostal', e.currentTarget.value)}
                  placeholder="28001"
                />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium">Población</label>
                <Input
                  value={formData().poblacion || ''}
                  onInput={(e) => updateFormField('poblacion', e.currentTarget.value)}
                  placeholder="Madrid"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-sm font-medium">Teléfono</label>
                <Input
                  value={formData().telefono || ''}
                  onInput={(e) => updateFormField('telefono', e.currentTarget.value)}
                  placeholder="912345678"
                />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData().email || ''}
                  onInput={(e) => updateFormField('email', e.currentTarget.value)}
                  placeholder="contacto@empresa.com"
                />
              </div>
            </div>

            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData().activo}
                onChange={(e) => updateFormField('activo', e.currentTarget.checked)}
                class="h-4 w-4 rounded border-gray-300"
              />
              <label for="activo" class="text-sm font-medium">
                Cliente activo
              </label>
            </div>
          </div>

          <DialogFooter class="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingCustomer() ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen()} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent class="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar al cliente{' '}
              <strong>{customerToDelete()?.nombreFiscal}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Customers;
