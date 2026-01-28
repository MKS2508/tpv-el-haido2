import { BeerIcon } from 'lucide-solid';
import { createSignal, For, Show, type Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import iconOptions from '@/assets/utils/icons/iconOptions.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import type Category from '@/models/Category.ts';
import type Product from '@/models/Product.ts';

type ProductFormProps = {
  product: Product;
  onSave: (product: Product) => void;
  categories: Category[];
  onCancel: () => void;
};

const BlobToBase64 = (file: Blob | null) => {
  if (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }
};

const ProductForm: Component<ProductFormProps> = (props) => {
  const [name, setName] = createSignal(props.product?.name || '');
  const [price, setPrice] = createSignal(props.product?.price ? props.product.price : 0);
  const [category, setCategory] = createSignal(props.product?.category || '');
  const [brand, setBrand] = createSignal(props.product?.brand || '');
  const [iconType, setIconType] = createSignal(props.product?.iconType || 'preset');
  const [selectedIcon, setSelectedIcon] = createSignal(props.product?.selectedIcon || '');
  const [uploadedImage, setUploadedImage] = createSignal<string | null>(props.product?.uploadedImage || null);

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    const iconOption = iconOptions.find((option) => option.value === selectedIcon());
    const icon =
      iconType() === 'preset'
        ? iconOption?.icon
        : uploadedImage()
          ? () => <img src={uploadedImage()!} alt={name()} class="w-6 h-6 object-cover" />
          : null;
    props.onSave({
      id: props.product?.id,
      name: name(),
      price: price(),
      category: category(),
      brand: brand(),
      icon: icon || BeerIcon,
      iconType: iconType(),
      selectedIcon: selectedIcon(),
      uploadedImage: uploadedImage(),
    });
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <div>
        <Label for="name">Nombre</Label>
        <Input id="name" value={name()} onInput={(e) => setName(e.currentTarget.value)} required />
      </div>
      <div>
        <Label for="price">Precio</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          value={price()}
          onInput={(e) => setPrice(parseFloat(e.currentTarget.value))}
          required
        />
      </div>
      <div>
        <Label for="category">Categoria</Label>
        <Select value={category()} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una categoria" />
          </SelectTrigger>
          <SelectContent>
            <For each={props.categories}>
              {(cat) => (
                <SelectItem value={cat.name}>
                  {cat.name}
                </SelectItem>
              )}
            </For>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label for="brand">Marca</Label>
        <Input id="brand" value={brand()} onInput={(e) => setBrand(e.currentTarget.value)} />
      </div>
      <div>
        <Label>Icono</Label>
        <div class="flex space-x-2">
          <Button
            type="button"
            variant={iconType() === 'preset' ? 'default' : 'outline'}
            onClick={() => setIconType('preset')}
          >
            Preestablecido
          </Button>
          <Button
            type="button"
            variant={iconType() === 'upload' ? 'default' : 'outline'}
            onClick={() => setIconType('upload')}
          >
            Subir Imagen
          </Button>
        </div>
      </div>
      <Show when={iconType() === 'preset'}>
        <div>
          <Label for="icon">Seleccionar Icono</Label>
          <Select value={selectedIcon()} onValueChange={setSelectedIcon}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un icono" />
            </SelectTrigger>
            <SelectContent>
              <For each={iconOptions}>
                {(option) => (
                  <SelectItem value={option.value}>
                    <div class="flex items-center">
                      <Dynamic component={option.icon} />
                      <span class="ml-2">{option.label}</span>
                    </div>
                  </SelectItem>
                )}
              </For>
            </SelectContent>
          </Select>
        </div>
      </Show>
      <Show when={iconType() === 'upload'}>
        <div>
          <Label for="icon-upload">Subir Imagen</Label>
          <Input
            id="icon-upload"
            type="file"
            accept="image/*"
            onInput={(e) => {
              const target = e.currentTarget as HTMLInputElement;
              setUploadedImage(
                target.files !== null
                  ? `data:image/png;base64,${BlobToBase64(target.files[0])}`
                  : null
              );
            }}
          />
        </div>
      </Show>
      <div class="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={props.onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
};

export default ProductForm;
