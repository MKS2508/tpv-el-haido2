import { BeerIcon } from 'lucide-solid';
import { createMemo, createSignal, onMount } from 'solid-js';
import seedData from '@/assets/seed-data.json';
import iconOptions from '@/assets/utils/icons/iconOptions';
import { config } from '@/lib/config';
import {
  generateUserId,
  parseImportJson,
  readFileAsImportData,
  shouldShowOnboarding,
  validatePin,
} from '@/lib/onboarding-utils';
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
  const [state, setState] = createSignal<OnboardingState>(INITIAL_ONBOARDING_STATE);

  const store = useStore();

  // Check localStorage for completion status on mount
  onMount(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (completed === 'true') {
        setState((prev) => ({ ...prev, isActive: false }));
      }
    } catch {
      // Ignore localStorage errors
    }
  });

  // Determine if onboarding should be shown
  const shouldShow = createMemo(() => {
    const currentState = state();
    if (!currentState.isActive) return false;

    return shouldShowOnboarding({
      forceOnboarding: config.onboarding?.forceOnboarding ?? false,
      onboardingCompleted: !currentState.isActive,
      productsCount: store.state.products.length,
      usersCount: store.state.users.length,
    });
  });

  // Navigation helpers
  const getStepIndex = (step: OnboardingStep): number => {
    return ONBOARDING_STEPS.indexOf(step);
  };

  const goToStep = (step: OnboardingStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  };

  const nextStep = () => {
    setState((prev) => {
      const currentIndex = getStepIndex(prev.currentStep);
      const nextIndex = currentIndex + 1;

      if (nextIndex >= ONBOARDING_STEPS.length) {
        return prev;
      }

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
      console.error('[Onboarding] Failed to parse import file');
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
      console.error('[Onboarding] Failed to parse JSON');
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
      console.error('[Onboarding] Failed to load seed data:', error);
      return false;
    }
  };

  const applyImportedData = async (): Promise<boolean> => {
    const importedData = state().importedData;
    if (!importedData) {
      console.warn('[Onboarding] No imported data to apply');
      return false;
    }

    try {
      // Get the storage adapter (it's a signal, so call it)
      const adapter = store.storageAdapter();

      // Convert products with icon component references (not React elements)
      const productsWithIcons: Product[] = importedData.products.map((product) => {
        const iconOption = iconOptions.find((option) => option.value === product.selectedIcon);
        return {
          ...product,
          // Store the icon component reference, not a rendered element
          icon: iconOption?.icon || BeerIcon,
        };
      });

      // Convert categories with icons
      const categoriesWithIcons: Category[] = importedData.categories.map((category) => ({
        ...category,
        icon: undefined,
      }));

      // Save to storage
      for (const product of productsWithIcons) {
        await adapter.createProduct(product);
      }

      for (const category of categoriesWithIcons) {
        await adapter.createCategory(category);
      }

      // Update store
      store.setProducts(productsWithIcons);
      store.setCategories(categoriesWithIcons);

      // Handle tables if present
      if (importedData.tables && importedData.tables.length > 0) {
        store.setTables(importedData.tables);
      }

      // Handle users if present and no users exist yet
      if (importedData.users && importedData.users.length > 0 && store.state.users.length === 0) {
        store.setUsers(importedData.users);
        setState((prev) => ({
          ...prev,
          createdUsers: importedData.users!,
        }));
      }

      console.log('[Onboarding] Data imported successfully');
      return true;
    } catch (error) {
      console.error('[Onboarding] Failed to apply imported data:', error);
      return false;
    }
  };

  // User actions
  const createUser = (userData: Omit<User, 'id'>) => {
    if (!validatePin(userData.pin)) {
      console.error('[Onboarding] Invalid PIN');
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
  const completeOnboarding = () => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {
      // Ignore localStorage errors
    }

    setState((prev) => ({
      ...prev,
      isActive: false,
      completedSteps: [...prev.completedSteps, prev.currentStep],
    }));
  };

  const restartOnboarding = () => {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }

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
