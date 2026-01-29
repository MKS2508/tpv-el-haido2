import { createEffect, createSignal } from 'solid-js';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import type Category from '@/models/Category.ts';
import { Label } from './ui/label';

type CategoryFormProps = {
  category: Category;
  onSave: (category: Category) => void;
  onCancel: () => void;
};

const CategoryForm = (props: CategoryFormProps) => {
  const [name, setName] = createSignal('');
  const [description, setDescription] = createSignal('');

  createEffect(() => {
    setName(props.category?.name || '');
    setDescription(props.category?.description || '');
  });

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    props.onSave({ id: props.category?.id, name: name(), description: description() });
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div>
        <Label for="name">Nombre</Label>
        <Input id="name" value={name()} onInput={(e) => setName(e.currentTarget.value)} required />
      </div>
      <div>
        <Label for="description">Descripcion</Label>
        <Input
          id="description"
          value={description()}
          onInput={(e) => setDescription(e.currentTarget.value)}
          required
        />
      </div>
      <div class="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={props.onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
};

export default CategoryForm;
