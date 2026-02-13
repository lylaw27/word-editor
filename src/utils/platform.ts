/**
 * Platform detection utilities
 * Determines if the app is running in Electron or web browser
 */

export const isElectron = (): boolean => {
  // Check if running in Electron environment
  return typeof window !== 'undefined' &&
         typeof window.electronAPI !== 'undefined';
};

export const isWeb = (): boolean => {
  return !isElectron();
};

export type Platform = 'electron' | 'web';

export const getPlatform = (): Platform => {
  return isElectron() ? 'electron' : 'web';
};

/**
 * Check if the browser supports the File System Access API
 * https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
 */
export const supportsFileSystemAccess = (): boolean => {
  return typeof window !== 'undefined' &&
         'showOpenFilePicker' in window &&
         'showSaveFilePicker' in window;
};
