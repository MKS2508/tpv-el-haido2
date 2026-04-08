import { Motion, Presence } from '@motionone/solid';
import { PlusIcon, Trash2Icon, UserPlusIcon, UsersIcon } from 'lucide-solid';
import { createEffect, createSignal, For, Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type User from '@/models/User';
import { UserForm } from '../components/UserForm';

interface CreateUsersStepProps {
  onNext: () => void;
  onBack: () => void;
  users: User[];
  onCreateUser: (user: Omit<User, 'id'>) => void;
  onDeleteUser: (userId: number) => void;
}

export function CreateUsersStep(props: CreateUsersStepProps) {
  const [isAddingUser, setIsAddingUser] = createSignal(false);

  createEffect(() => {
    setIsAddingUser(props.users.length === 0);
  });

  const handleSubmit = (userData: Omit<User, 'id'>) => {
    props.onCreateUser(userData);
    setIsAddingUser(false);
  };

  return (
    <Card class="w-full max-w-2xl mx-auto border-none shadow-2xl bg-background/60 backdrop-blur-xl overflow-hidden">
      <CardHeader class="bg-primary/5 pb-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-primary text-primary-foreground">
              <UsersIcon class="h-6 w-6" />
            </div>
            <div>
              <CardTitle class="text-2xl">Gestion de Usuarios</CardTitle>
              <CardDescription>Crea los perfiles que tendran acceso al sistema.</CardDescription>
            </div>
          </div>
          <Show when={!isAddingUser()}>
            <Button onClick={() => setIsAddingUser(true)} size="sm" class="gap-2">
              <PlusIcon class="h-4 w-4" />
              Nuevo Usuario
            </Button>
          </Show>
        </div>
      </CardHeader>
      <CardContent class="pt-6">
        <div class="grid md:grid-cols-2 gap-8">
          {/* List of Users */}
          <div class="space-y-4">
            <h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Usuarios Configurados ({props.users.length})
            </h3>

            <div class="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              <Presence exitBeforeEnter>
                <Show
                  when={props.users.length > 0}
                  fallback={
                    <Motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      class="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground"
                    >
                      <UserPlusIcon class="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>No hay usuarios todavia</p>
                    </Motion.div>
                  }
                >
                  <For each={props.users}>
                    {(user) => (
                      <Motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        class="group flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-transparent hover:border-primary/20 hover:bg-accent transition-all duration-200"
                      >
                        <div class="flex items-center gap-3">
                          <div class="h-10 w-10 rounded-full border-2 border-primary/10 overflow-hidden bg-background">
                            <img
                              src={user.profilePicture || '/placeholder-avatar.svg'}
                              alt={user.name}
                              class="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-avatar.svg';
                              }}
                            />
                          </div>
                          <div>
                            <p class="font-medium text-sm">{user.name}</p>
                            <p class="text-xs text-muted-foreground">ID: {user.id}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => props.onDeleteUser(user.id)}
                          class="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2Icon class="h-4 w-4" />
                        </Button>
                      </Motion.div>
                    )}
                  </For>
                </Show>
              </Presence>
            </div>

            <Show when={props.users.length === 0 && !isAddingUser()}>
              <p class="text-xs text-destructive flex items-center gap-1.5 mt-2">
                <span class="h-1 w-1 rounded-full bg-destructive" />
                Se requiere al menos un usuario para continuar
              </p>
            </Show>
          </div>

          {/* User Form */}
          <div class="bg-muted/30 rounded-2xl p-6 border border-muted">
            <Show
              when={isAddingUser()}
              fallback={
                <div class="h-full flex flex-col items-center justify-center text-center p-8">
                  <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <UserPlusIcon class="h-8 w-8 text-primary" />
                  </div>
                  <h3 class="font-semibold mb-2">¿Quieres añadir mas?</h3>
                  <p class="text-sm text-muted-foreground mb-6">
                    Puedes configurar tantos usuarios como necesites.
                  </p>
                  <Button variant="outline" onClick={() => setIsAddingUser(true)}>
                    Añadir otro usuario
                  </Button>
                </div>
              }
            >
              <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div class="flex justify-between items-center mb-6">
                  <h3 class="font-semibold text-lg">Nuevo Usuario</h3>
                  <Show when={props.users.length > 0}>
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingUser(false)}>
                      Cancelar
                    </Button>
                  </Show>
                </div>
                <UserForm onSubmit={handleSubmit} submitLabel="Crear Usuario" />
              </Motion.div>
            </Show>
          </div>
        </div>
      </CardContent>
      <CardFooter class="flex justify-between border-t p-6 bg-muted/10 mt-6">
        <Button variant="ghost" onClick={props.onBack}>
          Anterior
        </Button>
        <Button onClick={props.onNext} disabled={props.users.length === 0}>
          Continuar
        </Button>
      </CardFooter>
    </Card>
  );
}

export default CreateUsersStep;
