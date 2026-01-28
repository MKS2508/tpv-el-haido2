import type { JSX } from 'solid-js';

export default interface Category {
  id: number;
  name: string;
  description: string;
  icon?: JSX.Element;
}
