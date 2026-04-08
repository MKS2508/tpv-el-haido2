/**
 * State Helpers for SolidJS + @mks2508/no-throw
 *
 * Bridges SolidJS reactivity (createSignal) with OperationState and TransactionState
 * from @mks2508/no-throw for consistent async operation handling.
 */

import type { OperationState, Result, ResultError, TransactionState } from '@mks2508/no-throw';
import {
  createIdleOp,
  createInitialState,
  createLoadingState,
  createFailedOp as createOpFailed,
  createSuccessOp as createOpSuccess,
  createPendingOp,
  createRevalidatingState,
  createFailedState as createTxFailed,
  createSuccessState as createTxSuccess,
} from '@mks2508/no-throw';
import { createSignal } from 'solid-js';
import type { AppErrorCode } from '@/lib/error-codes';
import { logWarn } from '@/lib/logger';

// ==================== OperationState Helper ====================

/**
 * Creates an OperationState signal with execute method for user-initiated actions
 *
 * @template TResult - Type of the success result data
 * @template TMeta - Type of metadata (defaults to empty object)
 *
 * @example
 * ```ts
 * const { state, execute, reset } = createOperationStateSignal<User>();
 *
 * // Execute operation
 * await execute(async () => {
 *   const result = await createUser(userData);
 *   return result; // Result<User, AppErrorCode>
 * });
 *
 * // Check status
 * state().status; // 'idle' | 'pending' | 'success' | 'failed' | 'cancelled'
 * state().data; // TResult | undefined
 * state().error; // ResultError<AppErrorCode> | undefined
 * ```
 */
export function createOperationStateSignal<
  TResult = void,
  TMeta extends Record<string, unknown> = Record<string, unknown>,
>() {
  const [state, setState] = createSignal<OperationState<TResult, TMeta>>(createIdleOp('operation'));

  /**
   * Execute an async operation and manage state transitions
   *
   * @param operation - Async function returning Result<TResult, ResultError<AppErrorCode>>
   * @returns Promise that resolves when operation completes
   */
  const execute = async (
    operation: () => Promise<Result<TResult, ResultError<AppErrorCode>>>
  ): Promise<void> => {
    const startedAt = Date.now();

    // Get current meta or use empty object (for idle state)
    const currentState = state();
    const currentMeta: TMeta =
      currentState.status === 'idle' ? ({} as TMeta) : (currentState.meta as TMeta);

    setState(createPendingOp<TResult, TMeta>('operation', currentMeta, 'Starting...'));

    try {
      const result = await operation();

      if (result.ok) {
        setState(
          createOpSuccess<TResult, TMeta>('operation', result.value, currentMeta, startedAt)
        );
      } else {
        setState(
          createOpFailed<TResult, TMeta>(
            'operation',
            result.error as ResultError<string>,
            currentMeta,
            startedAt
          )
        );
      }
    } catch (error) {
      setState(
        createOpFailed<TResult, TMeta>(
          'operation',
          {
            code: 'UNKNOWN',
            message: String(error),
          } as ResultError<string>,
          currentMeta,
          startedAt
        )
      );
    }
  };

  /** Reset state to idle */
  const reset = () => setState(createIdleOp('operation') as OperationState<TResult, TMeta>);

  return { state, execute, reset };
}

// ==================== TransactionState Helper ====================

/**
 * Creates a TransactionState signal for data fetching operations
 *
 * @template T - Type of the data being fetched
 *
 * @example
 * ```ts
 * const { state, execute, refetch } = createTransactionStateSignal<User[]>();
 *
 * // Initial load
 * await execute(async () => {
 *   const result = await fetchUsers();
 *   return result; // Result<User[], AppErrorCode>
 * });
 *
 * // Refetch with revalidating state (shows stale data while loading)
 * await refetch(async () => {
 *   const result = await fetchUsers();
 *   return result;
 * });
 * ```
 */
export function createTransactionStateSignal<T>() {
  const [state, setState] = createSignal<TransactionState<T, ResultError<string>>>(
    createInitialState<T, ResultError<string>>()
  );

  // Store the last transaction function for refetch
  let lastTransaction: (() => Promise<Result<T, ResultError<AppErrorCode>>>) | null = null;

  /**
   * Execute a data fetching transaction
   *
   * @param transaction - Async function returning Result<T, ResultError<AppErrorCode>>
   * @returns Promise that resolves when transaction completes
   */
  const execute = async (
    transaction: () => Promise<Result<T, ResultError<AppErrorCode>>>
  ): Promise<void> => {
    // Store transaction for potential refetch
    lastTransaction = transaction;

    setState(createLoadingState<T, ResultError<string>>('Loading...'));

    const result = await transaction();
    setState(
      result.ok
        ? createTxSuccess<T, ResultError<string>>(result.value)
        : createTxFailed<T, ResultError<string>>(result.error as ResultError<string>)
    );
  };

  /**
   * Refetch data while showing current data (revalidating state)
   *
   * Only works if current status is 'success'. Otherwise behaves like execute().
   *
   * @param transaction - Optional transaction function. If not provided, uses the last executed transaction.
   */
  const refetch = async (
    transaction?: () => Promise<Result<T, ResultError<AppErrorCode>>>
  ): Promise<void> => {
    const tx = transaction ?? lastTransaction;

    if (!tx) {
      logWarn('TransactionState', 'No transaction provided and no previous transaction to refetch');
      return;
    }

    const currentState = state();
    if (currentState.status !== 'success') {
      return execute(tx);
    }

    // At this point, status is 'success', so data exists
    setState(createRevalidatingState<T, ResultError<string>>(currentState.data, 'Refreshing...'));

    const result = await tx();
    setState(
      result.ok
        ? createTxSuccess<T, ResultError<string>>(result.value)
        : createTxFailed<T, ResultError<string>>(result.error as ResultError<string>)
    );
  };

  return { state, execute, refetch };
}

// ==================== Type Guards ====================

/**
 * Check if an OperationState is actively processing (pending)
 */
export function isOpActive<T, M>(state: OperationState<T, M>): boolean {
  return state.status === 'pending';
}

/**
 * Check if an OperationState is completed successfully or failed
 */
export function isOpDone<T, M>(state: OperationState<T, M>): boolean {
  return state.status === 'success' || state.status === 'failed' || state.status === 'cancelled';
}

/**
 * Check if a TransactionState is loading or revalidating
 */
export function isPending<T>(state: TransactionState<T, unknown>): boolean {
  return state.status === 'loading' || state.status === 'revalidating';
}

/**
 * Check if a TransactionState has data (success or revalidating)
 */
export function hasData<T>(state: TransactionState<T, unknown>): boolean {
  return state.status === 'success' || state.status === 'revalidating';
}
