import { isErr, tryCatchAsync } from '@mks2508/no-throw';
import type Category from '@/models/Category';
import type { ImportData } from '@/models/Onboarding';
import type Product from '@/models/Product';
import type ITable from '@/models/Table';
import type User from '@/models/User';

/**
 * Error codes specific to onboarding operations
 */
export const OnboardingErrorCode = {
  ParseFailed: 'ONBOARDING_PARSE_FAILED',
  ValidationFailed: 'ONBOARDING_VALIDATION_FAILED',
  ImportFailed: 'ONBOARDING_IMPORT_FAILED',
  FileReadFailed: 'ONBOARDING_FILE_READ_FAILED',
} as const;

export type OnboardingErrorCode = (typeof OnboardingErrorCode)[keyof typeof OnboardingErrorCode];

/**
 * Parse JSON string into ImportData
 */
export function parseImportJson(jsonString: string): ImportData | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (validateImportData(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate that an object conforms to ImportData structure
 */
export function validateImportData(data: unknown): data is ImportData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Products array is required
  if (!Array.isArray(obj.products)) {
    return false;
  }

  // Categories array is required
  if (!Array.isArray(obj.categories)) {
    return false;
  }

  // Validate products structure
  const productsValid = obj.products.every((p: unknown) => {
    if (!p || typeof p !== 'object') return false;
    const product = p as Record<string, unknown>;
    return (
      typeof product.id === 'number' &&
      typeof product.name === 'string' &&
      typeof product.price === 'number' &&
      typeof product.category === 'string'
    );
  });

  if (!productsValid) {
    return false;
  }

  // Validate categories structure
  const categoriesValid = obj.categories.every((c: unknown) => {
    if (!c || typeof c !== 'object') return false;
    const category = c as Record<string, unknown>;
    return typeof category.id === 'number' && typeof category.name === 'string';
  });

  if (!categoriesValid) {
    return false;
  }

  // Optional: validate tables if present
  if (obj.tables !== undefined) {
    if (!Array.isArray(obj.tables)) return false;
    const tablesValid = obj.tables.every((t: unknown) => {
      if (!t || typeof t !== 'object') return false;
      const table = t as Record<string, unknown>;
      return typeof table.id === 'number' && typeof table.name === 'string';
    });
    if (!tablesValid) return false;
  }

  // Optional: validate users if present
  if (obj.users !== undefined) {
    if (!Array.isArray(obj.users)) return false;
    const usersValid = obj.users.every((u: unknown) => {
      if (!u || typeof u !== 'object') return false;
      const user = u as Record<string, unknown>;
      return (
        typeof user.id === 'number' && typeof user.name === 'string' && typeof user.pin === 'string'
      );
    });
    if (!usersValid) return false;
  }

  return true;
}

/**
 * Read a file and parse it as JSON ImportData
 */
export async function readFileAsImportData(file: File): Promise<ImportData | null> {
  const result = await tryCatchAsync(async () => {
    const text = await file.text();
    return parseImportJson(text);
  }, OnboardingErrorCode.FileReadFailed);

  if (isErr(result)) {
    console.error('[Onboarding] Failed to read file:', result.error);
    return null;
  }

  return result.value;
}

/**
 * Validate a single product
 */
export function validateProduct(product: unknown): product is Omit<Product, 'icon'> {
  if (!product || typeof product !== 'object') return false;
  const p = product as Record<string, unknown>;
  return (
    typeof p.id === 'number' &&
    typeof p.name === 'string' &&
    typeof p.price === 'number' &&
    typeof p.category === 'string' &&
    typeof p.brand === 'string' &&
    typeof p.iconType === 'string' &&
    typeof p.selectedIcon === 'string'
  );
}

/**
 * Validate a single category
 */
export function validateCategory(category: unknown): category is Omit<Category, 'icon'> {
  if (!category || typeof category !== 'object') return false;
  const c = category as Record<string, unknown>;
  return (
    typeof c.id === 'number' && typeof c.name === 'string' && typeof c.description === 'string'
  );
}

/**
 * Validate a single table
 */
export function validateTable(table: unknown): table is ITable {
  if (!table || typeof table !== 'object') return false;
  const t = table as Record<string, unknown>;
  return typeof t.id === 'number' && typeof t.name === 'string' && typeof t.available === 'boolean';
}

/**
 * Validate a single user
 */
export function validateUser(user: unknown): user is User {
  if (!user || typeof user !== 'object') return false;
  const u = user as Record<string, unknown>;
  return (
    typeof u.id === 'number' &&
    typeof u.name === 'string' &&
    typeof u.pin === 'string' &&
    u.pin.length === 4 &&
    typeof u.profilePicture === 'string'
  );
}

/**
 * Generate a unique ID for a new user
 */
export function generateUserId(existingUsers: User[]): number {
  if (existingUsers.length === 0) return 1;
  return Math.max(...existingUsers.map((u) => u.id)) + 1;
}

/**
 * Validate a PIN (must be 4 digits)
 */
export function validatePin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Get counts from import data for display
 */
export function getImportDataCounts(data: ImportData): {
  products: number;
  categories: number;
  tables: number;
  users: number;
} {
  return {
    products: data.products.length,
    categories: data.categories.length,
    tables: data.tables?.length ?? 0,
    users: data.users?.length ?? 0,
  };
}

/**
 * Merge import data with existing data, avoiding duplicates by ID
 */
export function mergeImportData<T extends { id: number }>(existing: T[], imported: T[]): T[] {
  const existingIds = new Set(existing.map((item) => item.id));
  const newItems = imported.filter((item) => !existingIds.has(item.id));
  return [...existing, ...newItems];
}

/**
 * Check if onboarding should be shown based on app state
 */
export function shouldShowOnboarding(params: {
  forceOnboarding: boolean;
  onboardingCompleted: boolean;
  productsCount: number;
  usersCount: number;
}): boolean {
  const { forceOnboarding, onboardingCompleted, productsCount, usersCount } = params;

  // Force onboarding via env var
  if (forceOnboarding) return true;

  // Already completed
  if (onboardingCompleted) return false;

  // No data exists - show onboarding
  if (productsCount === 0 && usersCount === 0) return true;

  // Only users exist, no products - show onboarding
  if (productsCount === 0) return true;

  return false;
}
