import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState } from 'react';
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

export function UserForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar',
}: UserFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [pin, setPin] = useState(initialData?.pin || '');
  const [profilePicture, setProfilePicture] = useState(
    initialData?.profilePicture || AVATAR_OPTIONS[0]
  );
  const [showPin, setShowPin] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; pin?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: string; pin?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!validatePin(pin)) {
      newErrors.pin = 'El PIN debe ser de 4 digitos';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: name.trim(),
      pin,
      profilePicture,
      pinnedProductIds: initialData?.pinnedProductIds || [],
    });

    // Reset form if not editing
    if (!initialData) {
      setName('');
      setPin('');
      setProfilePicture(AVATAR_OPTIONS[0]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="user-name">Nombre</Label>
        <Input
          id="user-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          placeholder="Nombre del usuario"
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-pin">PIN (4 digitos)</Label>
        <div className="relative">
          <Input
            id="user-pin"
            type={showPin ? 'text' : 'password'}
            value={pin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPin(value);
              setErrors((prev) => ({ ...prev, pin: undefined }));
            }}
            placeholder="****"
            maxLength={4}
            className={errors.pin ? 'border-destructive pr-10' : 'pr-10'}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowPin(!showPin)}
          >
            {showPin ? (
              <EyeOffIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
        {errors.pin && (
          <p className="text-sm text-destructive">{errors.pin}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Avatar</Label>
        <div className="flex gap-2 flex-wrap">
          {AVATAR_OPTIONS.map((avatar) => (
            <button
              key={avatar}
              type="button"
              onClick={() => setProfilePicture(avatar)}
              className={`w-12 h-12 rounded-full border-2 overflow-hidden transition-colors ${
                profilePicture === avatar
                  ? 'border-primary ring-2 ring-primary ring-offset-2'
                  : 'border-muted hover:border-muted-foreground'
              }`}
            >
              <img
                src={avatar}
                alt="Avatar option"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-avatar.svg';
                }}
              />
            </button>
          ))}
        </div>
        <div className="mt-2">
          <Label htmlFor="custom-avatar" className="text-sm text-muted-foreground">
            O introduce una URL personalizada:
          </Label>
          <Input
            id="custom-avatar"
            type="text"
            value={profilePicture}
            onChange={(e) => setProfilePicture(e.target.value)}
            placeholder="/ruta/al/avatar.png"
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default UserForm;
