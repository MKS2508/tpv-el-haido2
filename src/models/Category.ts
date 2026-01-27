import type React from 'react';

export default interface Category {
  id: number;
  name: string;
  description: string;
  icon?: React.ReactElement;
}
