export default interface Customer {
  id: number;
  cifNif: string;
  nombreFiscal: string;
  nombreComercial: string;
  direccion: string;
  codigoPostal: string;
  poblacion: string;
  telefono: string;
  email: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}
