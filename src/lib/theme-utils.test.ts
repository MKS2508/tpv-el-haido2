import { beforeEach, describe, expect, it } from 'vitest';
import { applyTheme, getStoredMode, getStoredTheme, saveMode, saveTheme } from '@/lib/theme-utils';

describe('theme-utils - localStorage getters/setters', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getStoredTheme devuelve "default" si no hay nada guardado', () => {
    expect(getStoredTheme()).toBe('default');
  });

  it('getStoredTheme devuelve el valor guardado en localStorage', () => {
    localStorage.setItem('color-theme', 'ocean');
    expect(getStoredTheme()).toBe('ocean');
  });

  it('getStoredMode devuelve "system" si no hay nada guardado', () => {
    expect(getStoredMode()).toBe('system');
  });

  it('getStoredMode devuelve el valor guardado en localStorage', () => {
    localStorage.setItem('theme-mode', 'dark');
    expect(getStoredMode()).toBe('dark');
  });

  it('saveTheme persiste el theme en localStorage', () => {
    saveTheme('sunset');
    expect(localStorage.getItem('color-theme')).toBe('sunset');
  });

  it('saveMode persiste el modo en localStorage', () => {
    saveMode('light');
    expect(localStorage.getItem('theme-mode')).toBe('light');
  });
});

describe('theme-utils - applyTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  });

  it('setea el atributo data-theme en el documento', () => {
    applyTheme('forest');
    expect(document.documentElement.getAttribute('data-theme')).toBe('forest');
  });

  it('añade la clase dark cuando mode es "dark"', () => {
    applyTheme('forest', 'dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('quita la clase dark cuando mode es "light"', () => {
    document.documentElement.classList.add('dark');
    applyTheme('forest', 'light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
