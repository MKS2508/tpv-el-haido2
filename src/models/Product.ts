import type { Component, JSX } from 'solid-js';

export default interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  brand: string;
  icon?: Component<JSX.IntrinsicElements>;
  iconType: string;
  selectedIcon: string;
  uploadedImage: string | null;
  stock?: number;
}
