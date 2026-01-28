// Search API no compatible con static export (GitHub Pages)
// Redirigir a una página de búsqueda estática o eliminar
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({ message: 'Search not available in static export' }, { status: 501 });
}
