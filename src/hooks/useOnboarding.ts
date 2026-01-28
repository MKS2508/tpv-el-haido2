import { BeerIcon } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
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
  INITIAL_ONBOARDING_STATE,
  ONBOARDING_STEPS,
  ONBOARDING_STORAGE_KEY,
  type ImportData,
  type OnboardingState,
  type OnboardingStep,
} from '@/models/Onboarding';
import type Product from '@/models/Product';
import type User from '@/models/User';
import type { StorageMode } from '@/services/storage-adapter.interface';
import useStore from '@/store/store';
import seedData from '@/assets/seed-data.json';

interface UseOnboardingReturn {
  state: OnboardingState;
  shouldShow: boolean;

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
  const [state, setState] = useState<OnboardingState>(INITIAL_ONBOARDING_STATE);

  const {
    products,
    users,
    storageAdapter,
    setStorageMode: setStoreStorageMode,
    setProducts,
    setCategories,
    setUsers,
    setTables,
  } = useStore(
    useShallow((s) => ({
      products: s.products,
      users: s.users,
      storageAdapter: s.storageAdapter,
      setStorageMode: s.setStorageMode,
      setProducts: s.setProducts,
      setCategories: s.setCategories,
      setUsers: s.setUsers,
      setTables: s.setTables,
    }))
  );

  // Check localStorage for completion status on mount
  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (completed === 'true') {
        setState((prev) => ({ ...prev, isActive: false }));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Determine if onboarding should be shown
  const shouldShow = useMemo(() => {
    if (!state.isActive) return false;

    return shouldShowOnboarding({
      forceOnboarding: config.onboarding?.forceOnboarding ?? false,
      onboardingCompleted: !state.isActive,
      productsCount: products.length,
      usersCount: users.length,
    });
  }, [state.isActive, products.length, users.length]);

  // Navigation helpers
  const getStepIndex = useCallback((step: OnboardingStep): number => {
    return ONBOARDING_STEPS.indexOf(step);
  }, []);

  const goToStep = useCallback((step: OnboardingStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
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
  }, [getStepIndex]);

  const previousStep = useCallback(() => {
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
  }, [getStepIndex]);

  const skipStep = useCallback(() => {
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
  }, [getStepIndex]);

  const canSkipStep = useCallback((step: OnboardingStep): boolean => {
    // Welcome and complete steps cannot be skipped
    return step !== 'welcome' && step !== 'complete';
  }, []);

  const isStepCompleted = useCallback(
    (step: OnboardingStep): boolean => {
      return state.completedSteps.includes(step);
    },
    [state.completedSteps]
  );

  // Import actions
  const importFromFile = useCallback(async (file: File): Promise<boolean> => {
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
  }, []);

  const importFromJson = useCallback(async (jsonString: string): Promise<boolean> => {
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
  }, []);

  const loadSeedData = useCallback(async (): Promise<boolean> => {
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
  }, []);

  const applyImportedData = useCallback(async (): Promise<boolean> => {
    const importedData = state.importedData;
    if (!importedData) {
      console.warn('[Onboarding] No imported data to apply');
      return false;
    }

    try {
      // Convert products with icons
      const productsWithIcons: Product[] = importedData.products.map((product) => ({
        ...product,
        icon: React.createElement(
          iconOptions.find((option) => option.value === product.selectedIcon)?.icon || BeerIcon
        ),
      }));

      // Convert categories with icons
      const categoriesWithIcons: Category[] = importedData.categories.map((category) => ({
        ...category,
        icon: undefined,
      }));

      // Save to storage
      for (const product of productsWithIcons) {
        await storageAdapter.createProduct(product);
      }

      for (const category of categoriesWithIcons) {
        await storageAdapter.createCategory(category);
      }

      // Update store
      setProducts(productsWithIcons);
      setCategories(categoriesWithIcons);

      // Handle tables if present
      if (importedData.tables && importedData.tables.length > 0) {
        setTables(importedData.tables);
      }

      // Handle users if present and no users exist yet
      if (importedData.users && importedData.users.length > 0 && users.length === 0) {
        setUsers(importedData.users);
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
  }, [state.importedData, storageAdapter, setProducts, setCategories, setTables, setUsers, users.length]);

  // User actions
  const createUser = useCallback(
    (userData: Omit<User, 'id'>) => {
      if (!validatePin(userData.pin)) {
        console.error('[Onboarding] Invalid PIN');
        return;
      }

      const allUsers = [...users, ...state.createdUsers];
      const newId = generateUserId(allUsers);
      const newUser: User = { ...userData, id: newId };

      setState((prev) => ({
        ...prev,
        createdUsers: [...prev.createdUsers, newUser],
      }));

      // Also update the store
      setUsers([...users, newUser]);
    },
    [users, state.createdUsers, setUsers]
  );

  const updateUser = useCallback(
    (user: User) => {
      setState((prev) => ({
        ...prev,
        createdUsers: prev.createdUsers.map((u) => (u.id === user.id ? user : u)),
      }));

      setUsers(users.map((u) => (u.id === user.id ? user : u)));
    },
    [users, setUsers]
  );

  const deleteUser = useCallback(
    (userId: number) => {
      setState((prev) => ({
        ...prev,
        createdUsers: prev.createdUsers.filter((u) => u.id !== userId),
      }));

      setUsers(users.filter((u) => u.id !== userId));
    },
    [users, setUsers]
  );

  // Configuration actions
  const setStorageMode = useCallback(
    (mode: StorageMode) => {
      setState((prev) => ({
        ...prev,
        selectedStorageMode: mode,
      }));

      setStoreStorageMode(mode);
    },
    [setStoreStorageMode]
  );

  const setTheme = useCallback((theme: string) => {
    setState((prev) => ({
      ...prev,
      selectedTheme: theme,
    }));
  }, []);

  // Completion actions
  const completeOnboarding = useCallback(() => {
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
  }, []);

  const restartOnboarding = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }

    setState(INITIAL_ONBOARDING_STATE);
  }, []);

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
