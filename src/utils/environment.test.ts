import { describe, expect, it } from 'vitest';
import { getEnvironmentInfo, isWebEnvironment, runByEnvironment } from '@/utils/environment';

describe('environment - isWebEnvironment', () => {
  it('devuelve true en jsdom (sin __TAURI_INTERNALS__ en window)', () => {
    expect(isWebEnvironment()).toBe(true);
  });
});

describe('environment - getEnvironmentInfo', () => {
  it('reporta platform web e isTauri false en jsdom', () => {
    const info = getEnvironmentInfo();
    expect(info.platform).toBe('web');
    expect(info.isTauri).toBe(false);
    expect(info.isWeb).toBe(true);
  });
});

describe('environment - runByEnvironment', () => {
  it('ejecuta la rama web cuando no estamos en Tauri', () => {
    const result = runByEnvironment({
      tauri: () => 'tauri-branch',
      web: () => 'web-branch',
    });
    expect(result).toBe('web-branch');
  });

  it('usa fallback si no hay rama web ni tauri aplicable', () => {
    const result = runByEnvironment({
      tauri: () => 'tauri-branch',
      fallback: () => 'fallback-branch',
    });
    expect(result).toBe('fallback-branch');
  });

  it('devuelve undefined si ninguna rama aplica', () => {
    const result = runByEnvironment({ tauri: () => 'tauri-branch' });
    expect(result).toBeUndefined();
  });
});
