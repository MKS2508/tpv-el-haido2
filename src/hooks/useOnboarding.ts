import { ok } from '@mks2508/no-throw';
import { BeerIcon } from 'lucide-solid';
import { createMemo, createSignal, onMount } from 'solid-js';
import seedData from '@/assets/seed-data.json';
import iconOptions from '@/assets/utils/icons/iconOptions';
import { config } from '@/lib/config';
import { createContextLogger } from '@/lib/logger';
import {
  generateUserId,
  parseImportJson,
  readFileAsImportData,
  shouldShowOnboarding,
  validatePin,
} from '@/lib/onboarding-utils';
import { createOperationStateSignal } from '@/lib/state-helpers';
import type Category from '@/models/Category';
import {
  type ImportData,
  INITIAL_ONBOARDING_STATE,
  ONBOARDING_STEPS,
  ONBOARDING_STORAGE_KEY,
  type OnboardingState,
  type OnboardingStep,
} from '@/models/Onboarding';
import type Product from '@/models/Product';
import type User from '@/models/User';
import type { StorageMode } from '@/services/storage-adapter.interface';
import useStore from '@/store/store';
import { getAppState, setAppState } from './useAppState';

// ==================== Singleton module-level state ====================
// Single source of truth: all calls to useOnboarding() share this state.
// Critical fix for "wizard step 5 stuck" bug — was 3 independent instances before.
// Each hook call returns references to these module-level lets, so any mutation
// (e.g. completeOnboarding setting isActive:false) is visible to ALL call sites.

let _state: ReturnType<typeof createSignal<OnboardingState>> | null = null;
let _applyDataOp: ReturnType<typeof createOperationStateSignal<void>> | null = null;
let _store: ReturnType<typeof useStore> | null = null;
let _initialized = false;
let _onMountRan = false;

function ensureInit() {
  if (_state && _applyDataOp && _store && _initialized) return;
  _state = createSignal<OnboardingState>(INITIAL_ONBOARDING_STATE);
  _applyDataOp = createOperationStateSignal<void>();
  _store = useStore();
  _initialized = true;
}

// ==================== Helpers mirroring App.tsx seeding logic ====================

function getFallbackProducts(): Product[] {
  const fallbackProducts = seedData.products as Product[];
  return fallbackProducts.map((product) => ({
    ...product,
    icon: iconOptions.find((option) => option.value === product.selectedIcon)?.icon || BeerIcon,
  })) as Product[];
}

function getFallbackCategories(): Category[] {
  const fallbackProducts = seedData.products as Product[];
  const uniqueCategories = [...new Set(fallbackProducts.map((product) => product.category))].filter(
    Boolean
  );
  return uniqueCategories.map((categoryName, index) => ({
    id: index + 1,
    name: categoryName,
    description: `Categoria ${categoryName}`,
    icon: undefined,
  }));
}

async function seedProductsIfNeeded(store: ReturnType<typeof useStore>) {
  const result = await store.storageAdapter().getProducts();
  if (result.ok && result.value.length === 0) {
    log.info('Seeding products from fallback');
    const fallbackProds = getFallbackProducts();
    for (const product of fallbackProds) {
      await store.storageAdapter().createProduct(product);
    }
    const reloaded = await store.storageAdapter().getProducts();
    if (reloaded.ok) {
      store.setProducts(reloaded.value);
      store.setBackendConnected(true);
      log.success('Seeded products to database', { count: reloaded.value.length });
    }
  }
}

async function seedCategoriesIfNeeded(store: ReturnType<typeof useStore>) {
  const result = await store.storageAdapter().getCategories();
  if (result.ok && result.value.length === 0) {
    log.info('Seeding categories from fallback');
    const fallbackCats = getFallbackCategories();
    for (const category of fallbackCats) {
      await store.storageAdapter().createCategory(category);
    }
    const reloaded = await store.storageAdapter().getCategories();
    if (reloaded.ok) {
      store.setCategories(reloaded.value);
      log.success('Seeded categories to database', { count: reloaded.value.length });
    }
  }
}

// ==================== Logger ====================

const log = createContextLogger('Onboarding');

// ==================== Types ====================

interface UseOnboardingReturn {
  state: () => OnboardingState;
  shouldShow: () => boolean;

  // Navigation
  goToStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipStep: () => void;

  // Import actions
  importFromFile: (file: File) => Promise<boolean>;
  importFromJson: (jsonString: string) => Promise<boolean>;
  loadSeedData: () => Promise<boolean>;
  applyImportedData: () => Promise<boolean>;
  /** OperationState for applyImportedData — use for rich loading/error UI */
  applyImportedDataState: ReturnType<typeof createOperationStateSignal<void>>['state'];

  // User actions
  createUser: (user: Omit<User, 'id'>) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: number) => void;

  // Configuration actions
  setStorageMode: (mode: StorageMode) => void;
  setTheme: (theme: string) => void;

  // Completion
  completeOnboarding: () => void;
  restartOnboarding: () => void;

  // Helpers
  canSkipStep: (step: OnboardingStep) => boolean;
  isStepCompleted: (step: OnboardingStep) => boolean;
  getStepIndex: (step: OnboardingStep) => number;
}

export function useOnboarding(): UseOnboardingReturn {
  ensureInit();

  // Type-narrowing after ensureInit
  const [state, setState] = _state!;
  const applyDataOp = _applyDataOp!;
  const store = _store!;

  // Check app_state for completion status on mount, with one-shot migration from localStorage.
  // Guarded by _onMountRan because the singleton is shared across multiple useOnboarding()
  // call sites — without this flag we'd run the migration/persistence read 3+ times and
  // race against completeOnboarding's setAppState('wizard.completed', 'true').
  onMount(async () => {
    if (_onMountRan) return;
    _onMountRan = true;

    // One-shot migration: if key exists in localStorage but not in app_state, copy it over
    try {
      const legacy = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      const existing = await getAppState('wizard.completed');
      if (legacy === 'true' && existing === null) {
        await setAppState('wizard.completed', 'true');
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      }
    } catch {
      // Ignore migration errors
    }

    // Read persisted completion from app_state
    const completed = await getAppState('wizard.completed');
    if (completed === 'true') {
      setState((prev) => ({ ...prev, isActive: false }));
    }
  });

  // Determine if onboarding should be shown — only the persistent flag + forceOnboarding
  const shouldShow = createMemo(() => {
    const currentState = state();
    if (!currentState.isActive) return false;

    return shouldShowOnboarding({
      forceOnboarding: config.onboarding?.forceOnboarding ?? false,
      onboardingCompleted: !currentState.isActive,
    });
  });

  // Navigation helpers
  const getStepIndex = (step: OnboardingStep): number => {
    return ONBOARDING_STEPS.indexOf(step);
  };

  const goToStep = (step: OnboardingStep) => {
    const from = state().currentStep;
    log.debug('wizard: goToStep', { from, to: step });
    setState((prev) => ({ ...prev, currentStep: step }));
  };

  const nextStep = () => {
    setState((prev) => {
      const currentIndex = getStepIndex(prev.currentStep);
      const nextIndex = currentIndex + 1;

      if (nextIndex >= ONBOARDING_STEPS.length) {
        return prev;
      }

      log.debug('wizard: nextStep', { from: prev.currentStep, to: ONBOARDING_STEPS[nextIndex] });
      return {
        ...prev,
        currentStep: ONBOARDING_STEPS[nextIndex],
        completedSteps: prev.completedSteps.includes(prev.currentStep)
          ? prev.completedSteps
          : [...prev.completedSteps, prev.currentStep],
      };
    });
  };

  const previousStep = () => {
    setState((prev) => {
      const currentIndex = getStepIndex(prev.currentStep);
      const prevIndex = currentIndex - 1;

      if (prevIndex < 0) {
        return prev;
      }

      log.debug('wizard: previousStep', {
        from: prev.currentStep,
        to: ONBOARDING_STEPS[prevIndex],
      });
      return {
        ...prev,
        currentStep: ONBOARDING_STEPS[prevIndex],
      };
    });
  };

  const skipStep = () => {
    setState((prev) => {
      const currentIndex = getStepIndex(prev.currentStep);
      const nextIndex = currentIndex + 1;

      if (nextIndex >= ONBOARDING_STEPS.length) {
        return prev;
      }

      log.debug('wizard: skipStep', { from: prev.currentStep, to: ONBOARDING_STEPS[nextIndex] });
      return {
        ...prev,
        currentStep: ONBOARDING_STEPS[nextIndex],
        skippedSteps: prev.skippedSteps.includes(prev.currentStep)
          ? prev.skippedSteps
          : [...prev.skippedSteps, prev.currentStep],
      };
    });
  };

  const canSkipStep = (step: OnboardingStep): boolean => {
    // Welcome and complete steps cannot be skipped
    return step !== 'welcome' && step !== 'complete';
  };

  const isStepCompleted = (step: OnboardingStep): boolean => {
    return state().completedSteps.includes(step);
  };

  // Import actions
  const importFromFile = async (file: File): Promise<boolean> => {
    const data = await readFileAsImportData(file);
    if (!data) {
      log.error('Failed to parse import file');
      return false;
    }

    setState((prev) => ({
      ...prev,
      importedData: data,
    }));

    return true;
  };

  const importFromJson = async (jsonString: string): Promise<boolean> => {
    const data = parseImportJson(jsonString);
    if (!data) {
      log.error('Failed to parse JSON');
      return false;
    }

    setState((prev) => ({
      ...prev,
      importedData: data,
    }));

    return true;
  };

  const loadSeedData = async (): Promise<boolean> => {
    try {
      const data = seedData as ImportData;

      setState((prev) => ({
        ...prev,
        importedData: data,
      }));

      return true;
    } catch (error) {
      log.error('Failed to load seed data', error instanceof Error ? error : undefined);
      return false;
    }
  };

  const applyImportedData = async (): Promise<boolean> => {
    const importedData = state().importedData;
    if (!importedData) {
      log.warn('No imported data to apply');
      return false;
    }

    await applyDataOp.execute(async () => {
      const adapter = store.storageAdapter();

      const productsWithIcons: Product[] = importedData.products.map((product) => {
        const iconOption = iconOptions.find((option) => option.value === product.selectedIcon);
        return {
          ...product,
          icon: iconOption?.icon || BeerIcon,
        };
      });

      const categoriesWithIcons: Category[] = importedData.categories.map((category) => ({
        ...category,
        icon: undefined,
      }));

      for (const product of productsWithIcons) {
        await adapter.createProduct(product);
      }

      for (const category of categoriesWithIcons) {
        await adapter.createCategory(category);
      }

      store.setProducts(productsWithIcons);
      store.setCategories(categoriesWithIcons);

      if (importedData.tables && importedData.tables.length > 0) {
        store.setTables(importedData.tables);
      }

      if (importedData.users && importedData.users.length > 0 && store.state.users.length === 0) {
        store.setUsers(importedData.users);
        setState((prev) => ({
          ...prev,
          createdUsers: importedData.users!,
        }));
      }

      log.success('Data imported');
      return ok(undefined);
    });

    return applyDataOp.state().status === 'success';
  };

  // User actions
  const createUser = (userData: Omit<User, 'id'>) => {
    if (!validatePin(userData.pin)) {
      log.error('Invalid PIN');
      return;
    }

    const allUsers = [...store.state.users, ...state().createdUsers];
    const newId = generateUserId(allUsers);
    const newUser: User = { ...userData, id: newId };

    setState((prev) => ({
      ...prev,
      createdUsers: [...prev.createdUsers, newUser],
    }));

    // Also update the store
    store.setUsers([...store.state.users, newUser]);
  };

  const updateUser = (user: User) => {
    setState((prev) => ({
      ...prev,
      createdUsers: prev.createdUsers.map((u) => (u.id === user.id ? user : u)),
    }));

    store.setUsers(store.state.users.map((u) => (u.id === user.id ? user : u)));
  };

  const deleteUser = (userId: number) => {
    setState((prev) => ({
      ...prev,
      createdUsers: prev.createdUsers.filter((u) => u.id !== userId),
    }));

    store.setUsers(store.state.users.filter((u) => u.id !== userId));
  };

  // Configuration actions
  const setStorageMode = (mode: StorageMode) => {
    setState((prev) => ({
      ...prev,
      selectedStorageMode: mode,
    }));

    store.setStorageMode(mode);
  };

  const setTheme = (theme: string) => {
    setState((prev) => ({
      ...prev,
      selectedTheme: theme,
    }));
  };

  // Completion actions
  const completeOnboarding = async () => {
    await setAppState('wizard.completed', 'true');

    setState((prev) => ({
      ...prev,
      isActive: false,
      completedSteps: [...prev.completedSteps, prev.currentStep],
    }));
    // Seed products and categories AFTER wizard completes.
    // try/catch each so a failure in one doesn't block the other, and so an
    // unhandled rejection can't leave the wizard overlay stuck over the app.
    try {
      await seedCategoriesIfNeeded(store);
    } catch (e) {
      log.error('wizard: seed categories failed', e instanceof Error ? e : new Error(String(e)));
    }
    try {
      await seedProductsIfNeeded(store);
    } catch (e) {
      log.error('wizard: seed products failed', e instanceof Error ? e : new Error(String(e)));
    }
  };

  const restartOnboarding = async () => {
    await setAppState('wizard.completed', '');

    setState(INITIAL_ONBOARDING_STATE);
  };

  return {
    state,
    shouldShow,
    goToStep,
    nextStep,
    previousStep,
    skipStep,
    importFromFile,
    importFromJson,
    loadSeedData,
    applyImportedData,
    applyImportedDataState: applyDataOp.state,
    createUser,
    updateUser,
    deleteUser,
    setStorageMode,
    setTheme,
    completeOnboarding,
    restartOnboarding,
    canSkipStep,
    isStepCompleted,
    getStepIndex,
  };
}

export default useOnboarding;
