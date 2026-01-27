import { BeerIcon } from 'lucide-react';
import React, { useState } from 'react';
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

const ProductForm = ({ product, onSave, onCancel, categories }: ProductFormProps) => {
  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(product?.price ? product.price : 0);
  const [category, setCategory] = useState(product?.category || '');
  const [brand, setBrand] = useState(product?.brand || '');
  const [iconType, setIconType] = useState(product?.iconType || 'preset');
  const [selectedIcon, setSelectedIcon] = useState(product?.selectedIcon || '');
  const [uploadedImage, setUploadedImage] = useState(product?.uploadedImage || null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const icon =
      iconType === 'preset' ? (
        iconOptions.find((option) => option.value === selectedIcon)?.icon
      ) : uploadedImage ? (
        <img src={uploadedImage} alt={name} className="w-6 h-6 object-cover" />
      ) : null;
    onSave({
      id: product?.id,
      name,
      price: price,
      category,
      brand,
      icon: React.isValidElement(icon) ? icon : <BeerIcon />,
      iconType,
      selectedIcon,
      uploadedImage,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="price">Precio</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(parseFloat(e.target.value))}
          required
        />
      </div>
      <div>
        <Label htmlFor="category">Categoría</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="brand">Marca</Label>
        <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
      </div>
      <div>
        <Label>Icono</Label>
        <div className="flex space-x-2">
          <Button
            type="button"
            variant={iconType === 'preset' ? 'default' : 'outline'}
            onClick={() => setIconType('preset')}
          >
            Preestablecido
          </Button>
          <Button
            type="button"
            variant={iconType === 'upload' ? 'default' : 'outline'}
            onClick={() => setIconType('upload')}
          >
            Subir Imagen
          </Button>
        </div>
      </div>
      {iconType === 'preset' && (
        <div>
          <Label htmlFor="icon">Seleccionar Icono</Label>
          <Select value={selectedIcon} onValueChange={setSelectedIcon}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un icono" />
            </SelectTrigger>
            <SelectContent>
              {iconOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center">
                    {React.createElement(option.icon)}
                    <span className="ml-2">{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {iconType === 'upload' && (
        <div>
          <Label htmlFor="icon-upload">Subir Imagen</Label>
          <Input
            id="icon-upload"
            type="file"
            accept="image/*"
            onChange={(e) =>
              setUploadedImage(
                e.target.files !== null
                  ? `data:image/png;base64,${BlobToBase64(e.target.files[0])}`
                  : null
              )
            }
          />
        </div>
      )}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
};

export default ProductForm;
