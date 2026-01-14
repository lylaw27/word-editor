import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { FileData, SaveResult, ElectronAPI } from './types';

// Type-safe IPC API exposed to renderer
const electronAPI: ElectronAPI = {
  // File operations
  openFile: (): Promise<FileData | null> => {
    return ipcRenderer.invoke('dialog:open');
  },

  saveFile: (content: string, htmlContent: string, defaultPath?: string): Promise<SaveResult> => {
    return ipcRenderer.invoke('dialog:save', { content, htmlContent, defaultPath });
  },

  saveFileAs: (content: string, htmlContent: string, defaultPath?: string): Promise<SaveResult> => {
    return ipcRenderer.invoke('dialog:saveAs', { content, htmlContent, defaultPath });
  },

  newFile: (): Promise<void> => {
    return ipcRenderer.invoke('file:new');
  },

  getCurrentPath: (): Promise<string | null> => {
    return ipcRenderer.invoke('file:getCurrentPath');
  },

  setCurrentPath: (filePath: string | null): Promise<void> => {
    return ipcRenderer.invoke('file:setCurrentPath', filePath);
  },

  // Menu event listeners
  onMenuNew: (callback: () => void): (() => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu-new', handler);
    return () => ipcRenderer.removeListener('menu-new', handler);
  },

  onMenuSave: (callback: () => void): (() => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu-save', handler);
    return () => ipcRenderer.removeListener('menu-save', handler);
  },

  onMenuSaveAs: (callback: () => void): (() => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu-save-as', handler);
    return () => ipcRenderer.removeListener('menu-save-as', handler);
  },

  onMenuUndo: (callback: () => void): (() => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu-undo', handler);
    return () => ipcRenderer.removeListener('menu-undo', handler);
  },

  onMenuRedo: (callback: () => void): (() => void) => {
    const handler = (_event: IpcRendererEvent) => callback();
    ipcRenderer.on('menu-redo', handler);
    return () => ipcRenderer.removeListener('menu-redo', handler);
  },

  onFileOpened: (callback: (fileData: FileData) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, fileData: FileData) => callback(fileData);
    ipcRenderer.on('file-opened', handler);
    return () => ipcRenderer.removeListener('file-opened', handler);
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
