/**
 * Servicio para gestionar imágenes stock de productos
 */

// Mapeo de nombres de productos a imágenes stock disponibles
const stockImageMapping: Record<string, string[]> = {
  // Cafés
  café: ['caf__solo.jpg', 'cafehielo.png'],
  cafe: ['caf__solo.jpg', 'cafehielo.png'],
  'café solo': ['caf__solo.jpg'],
  'cafe solo': ['caf__solo.jpg'],
  'café con hielo': ['cafehielo.png'],
  'cafe con hielo': ['cafehielo.png'],
  'café con leche': ['caf__solo.jpg'],
  cortado: ['caf__solo.jpg'],
  espresso: ['caf__solo.jpg'],
  americano: ['caf__solo.jpg'],
  cappuccino: ['caf__solo.jpg'],
  latte: ['caf__solo.jpg'],

  // Tés
  té: ['tehielos1.jpeg', 'tehielos2.webp'],
  te: ['tehielos1.jpeg', 'tehielos2.webp'],
  'té con hielo': ['tehielos1.jpeg', 'tehielos2.webp'],
  'te con hielo': ['tehielos1.jpeg', 'tehielos2.webp'],
  'té frío': ['tehielos1.jpeg', 'tehielos2.webp'],
  'te frio': ['tehielos1.jpeg', 'tehielos2.webp'],

  // Cervezas
  cerveza: ['cerveza.alhambraverde.png', 'alharoja.png'],
  alhambra: ['cerveza.alhambraverde.png', 'alharoja.png'],
  beer: ['cerveza.alhambraverde.png'],
  caña: ['cerveza.alhambraverde.png'],

  // Refrescos
  'coca-cola': ['coca-cola-logo.svg'],
  'coca cola': ['coca-cola-logo.svg'],
  cola: ['coca-cola-logo.svg'],
  nestea: ['Nestea_logo.svg.png'],
  'té nestea': ['Nestea_logo.svg.png'],
  'te nestea': ['Nestea_logo.svg.png'],

  // Categorías genéricas
  bebida: ['img_1.png', 'img_2.png'],
  bebidas: ['img_1.png', 'img_2.png'],
  refresco: ['coca-cola-logo.svg', 'Nestea_logo.svg.png'],
  refrescos: ['coca-cola-logo.svg', 'Nestea_logo.svg.png'],
};

// Imágenes genéricas por categoría
const categoryFallbacks: Record<string, string[]> = {
  cafés: ['caf__solo.jpg', 'cafehielo.png'],
  cafe: ['caf__solo.jpg', 'cafehielo.png'],
  bebidas: ['img_1.png', 'img_2.png', 'img_3.png'],
  cervezas: ['cerveza.alhambraverde.png', 'alharoja.png'],
  refrescos: ['coca-cola-logo.svg', 'Nestea_logo.svg.png'],
  licores: ['img_4.png'],
  vinos: ['img_3.png'],
  tapas: ['img.png'],
  bocadillos: ['img.png'],
  entrantes: ['img.png'],
  postres: ['img_2.png'],
};

// Imágenes genéricas por defecto
const defaultImages = ['img.png', 'img_3.png', 'img_4.png', 'descarga (1).jpeg'];

class StockImagesService {
  /**
   * Obtiene una imagen stock para un producto basándose en su nombre y categoría
   * @param productName Nombre del producto
   * @param category Categoría del producto
   * @returns URL de la imagen stock o null si no se encuentra
   */
  getStockImage(productName: string, category?: string): string | null {
    if (!productName) return null;

    const nameLower = productName.toLowerCase();

    // 1. Buscar coincidencia exacta por nombre
    if (stockImageMapping[nameLower]) {
      const images = stockImageMapping[nameLower];
      return this.getRandomImage(images);
    }

    // 2. Buscar coincidencias parciales en el nombre
    for (const [key, images] of Object.entries(stockImageMapping)) {
      if (nameLower.includes(key) || key.includes(nameLower)) {
        return this.getRandomImage(images);
      }
    }

    // 3. Buscar por palabras clave específicas
    const keywords = ['café', 'cafe', 'té', 'te', 'cerveza', 'cola', 'nestea', 'refresco'];
    for (const keyword of keywords) {
      if (nameLower.includes(keyword) && stockImageMapping[keyword]) {
        return this.getRandomImage(stockImageMapping[keyword]);
      }
    }

    // 4. Usar categoría como fallback
    if (category) {
      const categoryLower = category.toLowerCase();

      // Buscar en fallbacks de categoría
      if (categoryFallbacks[categoryLower]) {
        return this.getRandomImage(categoryFallbacks[categoryLower]);
      }

      // Buscar coincidencias parciales en categoría
      for (const [key, images] of Object.entries(categoryFallbacks)) {
        if (categoryLower.includes(key) || key.includes(categoryLower)) {
          return this.getRandomImage(images);
        }
      }
    }

    // 5. Usar imagen genérica por defecto
    return this.getRandomImage(defaultImages);
  }

  /**
   * Selecciona una imagen aleatoria de un array
   * Para evitar repetición, usa un hash del nombre del producto para selección consistente
   */
  private getRandomImage(images: string[]): string {
    if (images.length === 0) return defaultImages[0];
    if (images.length === 1) return `/productos/${images[0]}`;

    // Usar índice aleatorio simple
    const index = Math.floor(Math.random() * images.length);
    return `/productos/${images[index]}`;
  }

  /**
   * Obtiene una imagen consistente basada en el ID del producto
   * Esto asegura que el mismo producto siempre muestre la misma imagen stock
   */
  getConsistentStockImage(
    productId: number,
    productName: string,
    category?: string
  ): string | null {
    const baseImage = this.getStockImage(productName, category);
    if (!baseImage) return null;

    // Si hay múltiples opciones, usar el ID para seleccionar consistentemente
    const nameLower = productName.toLowerCase();
    let imageOptions: string[] = [];

    // Obtener todas las opciones posibles
    if (stockImageMapping[nameLower]) {
      imageOptions = stockImageMapping[nameLower];
    } else if (category) {
      const categoryLower = category.toLowerCase();
      if (categoryFallbacks[categoryLower]) {
        imageOptions = categoryFallbacks[categoryLower];
      }
    }

    if (imageOptions.length <= 1) {
      return baseImage;
    }

    // Usar el ID del producto para seleccionar consistentemente
    const index = productId % imageOptions.length;
    return `/productos/${imageOptions[index]}`;
  }
}

export const stockImagesService = new StockImagesService();
export default stockImagesService;
