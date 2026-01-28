import { createSignal, For, Show } from 'solid-js';
import { EyeIcon, EyeOffIcon } from 'lucide-solid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validatePin } from '@/lib/onboarding-utils';
import type User from '@/models/User';

interface UserFormProps {
  initialData?: Partial<User>;
  onSubmit: (user: Omit<User, 'id'>) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

const AVATAR_OPTIONS = [
  '/panxo.svg',
  '/nuka.svg',
  '/avatar-1.svg',
  '/avatar-2.svg',
];

export function UserForm(props: UserFormProps) {
  const [name, setName] = createSignal(props.initialData?.name || '');
  const [pin, setPin] = createSignal(props.initialData?.pin || '');
  const [profilePicture, setProfilePicture] = createSignal(
    props.initialData?.profilePicture || AVATAR_OPTIONS[0]
  );
  const [showPin, setShowPin] = createSignal(false);
  const [errors, setErrors] = createSignal<{ name?: string; pin?: string }>({});

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();

    const newErrors: { name?: string; pin?: string } = {};

    if (!name().trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!validatePin(pin())) {
      newErrors.pin = 'El PIN debe ser de 4 digitos';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    props.onSubmit({
      name: name().trim(),
      pin: pin(),
      profilePicture: profilePicture(),
      pinnedProductIds: props.initialData?.pinnedProductIds || [],
    });

    // Reset form if not editing
    if (!props.initialData) {
      setName('');
      setPin('');
      setProfilePicture(AVATAR_OPTIONS[0]);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div class="space-y-2">
        <Label for="user-name">Nombre</Label>
        <Input
          id="user-name"
          type="text"
          value={name()}
          onInput={(e) => {
            setName(e.currentTarget.value);
            setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          placeholder="Nombre del usuario"
          class={errors().name ? 'border-destructive' : ''}
        />
        <Show when={errors().name}>
          <p class="text-sm text-destructive">{errors().name}</p>
        </Show>
      </div>

      <div class="space-y-2">
        <Label for="user-pin">PIN (4 digitos)</Label>
        <div class="relative">
          <Input
            id="user-pin"
            type={showPin() ? 'text' : 'password'}
            value={pin()}
            onInput={(e) => {
              const value = e.currentTarget.value.replace(/\D/g, '').slice(0, 4);
              setPin(value);
              setErrors((prev) => ({ ...prev, pin: undefined }));
            }}
            placeholder="****"
            maxLength={4}
            class={errors().pin ? 'border-destructive pr-10' : 'pr-10'}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowPin(!showPin())}
          >
            <Show when={showPin()} fallback={<EyeIcon class="h-4 w-4" />}>
              <EyeOffIcon class="h-4 w-4" />
            </Show>
          </Button>
        </div>
        <Show when={errors().pin}>
          <p class="text-sm text-destructive">{errors().pin}</p>
        </Show>
      </div>

      <div class="space-y-2">
        <Label>Avatar</Label>
        <div class="flex gap-2 flex-wrap">
          <For each={AVATAR_OPTIONS}>
            {(avatar) => (
              <button
                type="button"
                onClick={() => setProfilePicture(avatar)}
                class={`w-12 h-12 rounded-full border-2 overflow-hidden transition-colors ${
                  profilePicture() === avatar
                    ? 'border-primary ring-2 ring-primary ring-offset-2'
                    : 'border-muted hover:border-muted-foreground'
                }`}
              >
                <img
                  src={avatar}
                  alt="Avatar option"
                  class="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-avatar.svg';
                  }}
                />
              </button>
            )}
          </For>
        </div>
        <div class="mt-2">
          <Label for="custom-avatar" class="text-sm text-muted-foreground">
            O introduce una URL personalizada:
          </Label>
          <Input
            id="custom-avatar"
            type="text"
            value={profilePicture()}
            onInput={(e) => setProfilePicture(e.currentTarget.value)}
            placeholder="/ruta/al/avatar.png"
            class="mt-1"
          />
        </div>
      </div>

      <div class="flex gap-2 pt-4">
        <Show when={props.onCancel}>
          <Button type="button" variant="outline" onClick={props.onCancel}>
            Cancelar
          </Button>
        </Show>
        <Button type="submit" class="flex-1">
          {props.submitLabel ?? 'Guardar'}
        </Button>
      </div>
    </form>
  );
}

export default UserForm;
