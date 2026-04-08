/**
 * State View Components for OperationState and TransactionState
 *
 * Reusable components that render different UI based on state status.
 * Provides consistent loading, success, error, and empty states across the app.
 */

import type { OperationState, ResultError, TransactionState } from '@mks2508/no-throw';
import { type JSX, Match, Switch } from 'solid-js';

// ==================== OperationStateView ====================

/**
 * Props for OperationStateView component
 *
 * @template TResult - Type of the success result data
 * @template TMeta - Type of metadata
 */
export interface OperationStateViewProps<TResult, TMeta> {
  /** The current operation state */
  state: OperationState<TResult, TMeta>;
  /** Custom loading UI (default: simple spinner) */
  loading?: JSX.Element;
  /** Custom success UI - receives the result data */
  success?: (data: TResult, meta?: TMeta) => JSX.Element;
  /** Custom error UI - receives the error */
  error?: (error: ResultError<string>, meta?: TMeta) => JSX.Element;
  /** Custom cancelled UI */
  cancelled?: JSX.Element;
  /** Custom idle UI */
  idle?: JSX.Element;
  /** Children render function for full control */
  children?: (state: OperationState<TResult, TMeta>) => JSX.Element;
}

/**
 * OperationStateView component
 *
 * Renders different UI based on OperationState status.
 *
 * @example
 * ```tsx
 * <OperationStateView
 *   state={operation.state()}
 *   loading={<Spinner />}
 *   success={(data) => <div>Created: {data.id}</div>}
 *   error={(error) => <Alert>{error.message}</Alert>}
 * />
 * ```
 */
export function OperationStateView<TResult, TMeta>(
  props: OperationStateViewProps<TResult, TMeta>
): JSX.Element {
  // If children render function is provided, give full control
  if (props.children) {
    return props.children(props.state);
  }

  return (
    <Switch fallback={null}>
      <Match when={props.state.status === 'idle'}>{props.idle ?? <IdleStateView />}</Match>

      <Match when={props.state.status === 'pending'}>
        {props.loading ?? (
          <LoadingStateView
            message={props.state.status === 'pending' ? props.state.message : undefined}
          />
        )}
      </Match>

      <Match when={props.state.status === 'success'}>
        {props.success ? (
          props.success(
            props.state.status === 'success'
              ? (props.state.result as TResult)
              : (undefined as TResult),
            props.state.status === 'success' ? props.state.meta : undefined
          )
        ) : (
          <SuccessStateView
            data={
              props.state.status === 'success'
                ? (props.state.result as TResult)
                : (undefined as TResult)
            }
          />
        )}
      </Match>

      <Match when={props.state.status === 'failed'}>
        {props.error ? (
          props.error(
            props.state.status === 'failed'
              ? (props.state.error as ResultError<string>)
              : { code: 'UNKNOWN', message: 'Unknown error' },
            props.state.status === 'failed' ? props.state.meta : undefined
          )
        ) : (
          <ErrorStateView
            error={
              props.state.status === 'failed'
                ? (props.state.error as ResultError<string>)
                : { code: 'UNKNOWN', message: 'Unknown error' }
            }
          />
        )}
      </Match>

      <Match when={props.state.status === 'cancelled'}>
        {props.cancelled ?? <CancelledStateView />}
      </Match>
    </Switch>
  );
}

// ==================== TransactionStateView ====================

/**
 * Props for TransactionStateView component
 *
 * @template T - Type of the data being fetched
 * @template E - Type of the error
 */
export interface TransactionStateViewProps<T, E> {
  /** The current transaction state */
  state: TransactionState<T, E>;
  /** Custom loading UI (default: simple spinner) */
  loading?: JSX.Element;
  /** Custom success UI - receives the data */
  success?: (data: T) => JSX.Element;
  /** Custom error UI - receives the error */
  error?: (error: E) => JSX.Element;
  /** Custom revalidating UI - receives stale data */
  revalidating?: (data: T) => JSX.Element;
  /** Custom initial/empty UI */
  empty?: JSX.Element;
  /** Children render function for full control */
  children?: (state: TransactionState<T, E>) => JSX.Element;
}

/**
 * TransactionStateView component
 *
 * Renders different UI based on TransactionState status.
 *
 * @example
 * ```tsx
 * <TransactionStateView
 *   state={transaction.state()}
 *   loading={<Spinner />}
 *   success={(users) => <UserList users={users} />}
 *   error={(error) => <Alert>{error.message}</Alert>}
 * />
 * ```
 */
export function TransactionStateView<T, E>(props: TransactionStateViewProps<T, E>): JSX.Element {
  // If children render function is provided, give full control
  if (props.children) {
    return props.children(props.state);
  }

  return (
    <Switch fallback={null}>
      <Match when={props.state.status === 'initial'}>{props.empty ?? <EmptyStateView />}</Match>

      <Match when={props.state.status === 'loading'}>
        {props.loading ?? (
          <LoadingStateView
            message={props.state.status === 'loading' ? props.state.message : undefined}
          />
        )}
      </Match>

      <Match when={props.state.status === 'success'}>
        {props.success ? (
          props.success(props.state.status === 'success' ? props.state.data : (undefined as T))
        ) : (
          <SuccessStateView
            data={props.state.status === 'success' ? props.state.data : (undefined as T)}
          />
        )}
      </Match>

      <Match when={props.state.status === 'failed'}>
        {props.error ? (
          props.error(
            props.state.status === 'failed'
              ? (props.state.error as E)
              : ({ code: 'UNKNOWN', message: 'Unknown error' } as E)
          )
        ) : (
          <ErrorStateView
            error={
              props.state.status === 'failed'
                ? (props.state.error as ResultError<string>)
                : { code: 'UNKNOWN', message: 'Unknown error' }
            }
          />
        )}
      </Match>

      <Match when={props.state.status === 'revalidating'}>
        {props.revalidating ? (
          props.revalidating(
            props.state.status === 'revalidating' ? props.state.data : (undefined as T)
          )
        ) : (
          <RevalidatingStateView
            data={props.state.status === 'revalidating' ? props.state.data : (undefined as T)}
            message={props.state.status === 'revalidating' ? props.state.message : undefined}
          />
        )}
      </Match>
    </Switch>
  );
}

// ==================== Default State Views ====================

/**
 * Default idle state view
 */
function IdleStateView(): JSX.Element {
  return (
    <div class="flex items-center justify-center p-4 text-muted-foreground">
      <p>Ready to start</p>
    </div>
  );
}

/**
 * Default loading state view with optional message
 */
function LoadingStateView(props: { message?: string }): JSX.Element {
  return (
    <div class="flex flex-col items-center justify-center gap-3 p-8">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
        aria-label="Loading"
      />
      {props.message && <p class="text-sm text-muted-foreground">{props.message}</p>}
    </div>
  );
}

/**
 * Default success state view
 */
function SuccessStateView<T>(props: { data: T }): JSX.Element {
  return (
    <div class="flex flex-col items-center justify-center gap-2 p-4 text-green-600">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-8 w-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <p class="font-medium">Operation completed successfully</p>
    </div>
  );
}

/**
 * Default error state view
 */
function ErrorStateView(props: { error: ResultError<string> }): JSX.Element {
  return (
    <div class="flex flex-col items-center justify-center gap-3 p-6 text-destructive">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-8 w-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <div class="text-center">
        <p class="font-medium">Operation failed</p>
        {props.error.message && (
          <p class="mt-1 text-sm text-muted-foreground">{props.error.message}</p>
        )}
        {props.error.code && (
          <p class="mt-1 text-xs text-muted-foreground">Error code: {props.error.code}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Default cancelled state view
 */
function CancelledStateView(): JSX.Element {
  return (
    <div class="flex flex-col items-center justify-center gap-2 p-4 text-muted-foreground">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-8 w-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <p class="font-medium">Operation was cancelled</p>
    </div>
  );
}

/**
 * Default empty/initial state view
 */
function EmptyStateView(): JSX.Element {
  return (
    <div class="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-12 w-12 opacity-50"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>No data available</p>
    </div>
  );
}

/**
 * Default revalidating state view
 */
function RevalidatingStateView<T>(props: { data: T; message?: string }): JSX.Element {
  return (
    <div class="relative">
      {/* Dim the content to show it's being refreshed */}
      <div class="opacity-50">{props.data as unknown as JSX.Element}</div>

      {/* Loading overlay */}
      <div class="absolute inset-0 flex items-center justify-center">
        <div
          class="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent"
          aria-label="Refreshing"
        />
      </div>

      {props.message && (
        <p class="mt-2 text-center text-sm text-muted-foreground">{props.message}</p>
      )}
    </div>
  );
}
