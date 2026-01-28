import type Category from '@/models/Category';
import type Product from '@/models/Product';
import type ITable from '@/models/Table';
import type User from '@/models/User';
import type { StorageMode } from '@/services/storage-adapter.interface';

export type OnboardingStep =
  | 'welcome'
  | 'storage'
  | 'import'
  | 'users'
  | 'theme'
  | 'complete';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'storage',
  'import',
  'users',
  'theme',
  'complete',
];

export interface OnboardingState {
  isActive: boolean;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skippedSteps: OnboardingStep[];

  // Data collected during onboarding
  selectedStorageMode: StorageMode | null;
  importedData: ImportData | null;
  createdUsers: User[];
  selectedTheme: string | null;
}

export interface ImportData {
  products: Omit<Product, 'icon'>[];
  categories: Omit<Category, 'icon'>[];
  tables?: ITable[];
  users?: User[];
}

export interface OnboardingConfig {
  forceOnboarding: boolean;
  skipIfDataExists: boolean;
  allowSkipSteps: boolean;
  requiredSteps: OnboardingStep[];
}

export const DEFAULT_ONBOARDING_CONFIG: OnboardingConfig = {
  forceOnboarding: false,
  skipIfDataExists: true,
  allowSkipSteps: true,
  requiredSteps: ['welcome', 'complete'],
};

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  isActive: true,
  currentStep: 'welcome',
  completedSteps: [],
  skippedSteps: [],
  selectedStorageMode: null,
  importedData: null,
  createdUsers: [],
  selectedTheme: null,
};

// Storage keys
export const ONBOARDING_STORAGE_KEY = 'tpv-onboarding-completed';
export const ONBOARDING_STATE_KEY = 'tpv-onboarding-state';
