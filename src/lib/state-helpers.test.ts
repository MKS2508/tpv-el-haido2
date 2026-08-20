import { err, ok } from '@mks2508/no-throw';
import { describe, expect, it } from 'vitest';
import { StorageErrorCode } from '@/lib/error-codes';
import {
  createOperationStateSignal,
  createTransactionStateSignal,
  hasData,
  isOpActive,
  isOpDone,
  isPending,
} from '@/lib/state-helpers';

describe('state-helpers - createOperationStateSignal', () => {
  it('pasa por pending y termina en success con el valor devuelto', async () => {
    const { state, execute } = createOperationStateSignal<string>();
    expect(state().status).toBe('idle');

    await execute(async () => ok('done'));

    expect(state().status).toBe('success');
    const finalState = state();
    if (finalState.status === 'success') expect(finalState.result).toBe('done');
  });

  it('termina en failed cuando la operación devuelve err', async () => {
    const { state, execute } = createOperationStateSignal<string>();

    await execute(async () => err({ code: StorageErrorCode.ReadFailed, message: 'algo fue mal' }));

    expect(state().status).toBe('failed');
  });

  it('termina en failed cuando la operación lanza una excepción', async () => {
    const { state, execute } = createOperationStateSignal<string>();

    await execute(async () => {
      throw new Error('excepcion inesperada');
    });

    expect(state().status).toBe('failed');
  });

  it('reset vuelve el estado a idle', async () => {
    const { state, execute, reset } = createOperationStateSignal<string>();
    await execute(async () => ok('done'));

    reset();

    expect(state().status).toBe('idle');
  });
});

describe('state-helpers - createTransactionStateSignal', () => {
  it('execute pasa por loading y termina en success', async () => {
    const { state, execute } = createTransactionStateSignal<number[]>();
    expect(state().status).toBe('initial');

    await execute(async () => ok([1, 2, 3]));

    const finalState = state();
    expect(finalState.status).toBe('success');
    if (finalState.status === 'success') expect(finalState.data).toEqual([1, 2, 3]);
  });

  it('refetch revalida usando la última transacción cuando no se pasa una nueva', async () => {
    const { state, execute, refetch } = createTransactionStateSignal<number[]>();
    await execute(async () => ok([1, 2, 3]));

    await refetch(async () => ok([4, 5, 6]));

    const finalState = state();
    expect(finalState.status).toBe('success');
    if (finalState.status === 'success') expect(finalState.data).toEqual([4, 5, 6]);
  });

  it('refetch sin transacción previa ni argumento no rompe y deja el estado como está', async () => {
    const { state, refetch } = createTransactionStateSignal<number[]>();

    await refetch();

    expect(state().status).toBe('initial');
  });
});

describe('state-helpers - OperationState predicates', () => {
  it('isOpActive es true solo en status pending', () => {
    expect(isOpActive({ status: 'pending' } as never)).toBe(true);
    expect(isOpActive({ status: 'idle' } as never)).toBe(false);
    expect(isOpActive({ status: 'success' } as never)).toBe(false);
  });

  it('isOpDone es true en success, failed y cancelled', () => {
    expect(isOpDone({ status: 'success' } as never)).toBe(true);
    expect(isOpDone({ status: 'failed' } as never)).toBe(true);
    expect(isOpDone({ status: 'cancelled' } as never)).toBe(true);
    expect(isOpDone({ status: 'pending' } as never)).toBe(false);
  });
});

describe('state-helpers - TransactionState predicates', () => {
  it('isPending es true en loading y revalidating', () => {
    expect(isPending({ status: 'loading' } as never)).toBe(true);
    expect(isPending({ status: 'revalidating' } as never)).toBe(true);
    expect(isPending({ status: 'success' } as never)).toBe(false);
  });

  it('hasData es true en success y revalidating', () => {
    expect(hasData({ status: 'success' } as never)).toBe(true);
    expect(hasData({ status: 'revalidating' } as never)).toBe(true);
    expect(hasData({ status: 'loading' } as never)).toBe(false);
  });
});
