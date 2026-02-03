/**
 * @file Desktop package exports
 * @description Exports types and utilities for use by the web app
 */

// Export types for use in renderer/web app
export type {
  ElectronAPI,
  FileOpenResult,
  FileSaveResult,
  ConfirmDialogOptions,
  MessageDialogOptions,
  AppPaths,
  MenuAction,
  MenuState,
} from './types/electron';

/**
 * Checks if the app is running in Electron
 */
export function isElectron(): boolean {
  // Renderer process
  if (
    typeof window !== 'undefined' &&
    typeof window.process === 'object' &&
    (window.process as NodeJS.Process).type === 'renderer'
  ) {
    return true;
  }

  // Main process
  if (
    typeof process !== 'undefined' &&
    typeof process.versions === 'object' &&
    Boolean(process.versions.electron)
  ) {
    return true;
  }

  // Check for user agent (fallback)
  if (
    typeof navigator === 'object' &&
    typeof navigator.userAgent === 'string' &&
    navigator.userAgent.includes('Electron')
  ) {
    return true;
  }

  return false;
}

/**
 * Gets the Electron API if available
 */
export function getElectronAPI(): import('./types/electron').ElectronAPI | undefined {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI;
  }
  return undefined;
}

/**
 * Hook-like function to safely call Electron API methods
 * Falls back to no-op or default values when not in Electron
 */
export function useElectronAPI(): {
  isElectron: boolean;
  api: import('./types/electron').ElectronAPI | null;
} {
  const inElectron = isElectron();
  const api = inElectron ? getElectronAPI() ?? null : null;

  return {
    isElectron: inElectron,
    api,
  };
}
