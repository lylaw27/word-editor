/**
 * Unified FileSystem API
 * Provides cross-platform file operations that work in both Electron and web environments
 */

import { isElectron, supportsFileSystemAccess } from '../utils/platform';
import type { FileData, SaveResult, DirectoryContents } from '../../electron/types';

// Extended file handle for web environment
interface WebFileHandle {
  file: File;
  handle?: FileSystemFileHandle;
}

// In-memory storage for web environment (fallback)
let currentFileHandle: WebFileHandle | null = null;

/**
 * Open a file dialog and read the file
 */
export async function openFile(): Promise<FileData | null> {
  if (isElectron()) {
    return window.electronAPI.openFile();
  }

  // Web implementation
  if (supportsFileSystemAccess()) {
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Text Files',
            accept: {
              'text/plain': ['.txt'],
              'text/markdown': ['.md'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            },
          },
        ],
        multiple: false,
      });

      const file = await fileHandle.getFile();
      const content = await file.text();

      // Store file handle for saving
      currentFileHandle = { file, handle: fileHandle };

      const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
      const fileType = ext === 'docx' ? 'docx' : ext === 'md' ? 'md' : 'txt';

      return {
        content,
        filePath: file.name, // In web, we use name as path
        fileName: file.name,
        fileType: fileType as 'txt' | 'md' | 'docx',
        isHtml: false,
      };
    } catch (error) {
      console.error('Error opening file:', error);
      return null;
    }
  } else {
    // Fallback to traditional file input
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.md,.docx';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const content = await file.text();
        currentFileHandle = { file };

        const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
        const fileType = ext === 'docx' ? 'docx' : ext === 'md' ? 'md' : 'txt';

        resolve({
          content,
          filePath: file.name,
          fileName: file.name,
          fileType: fileType as 'txt' | 'md' | 'docx',
          isHtml: false,
        });
      };

      input.click();
    });
  }
}

/**
 * Save file (uses current file path if available)
 */
export async function saveFile(
  content: string,
  htmlContent: string,
  defaultPath?: string
): Promise<SaveResult> {
  if (isElectron()) {
    return window.electronAPI.saveFile(content, htmlContent, defaultPath);
  }

  // Web implementation
  if (currentFileHandle?.handle && supportsFileSystemAccess()) {
    try {
      // Use existing file handle
      const writable = await currentFileHandle.handle.createWritable();
      await writable.write(content);
      await writable.close();

      return {
        success: true,
        filePath: currentFileHandle.file.name,
        fileName: currentFileHandle.file.name,
      };
    } catch (error) {
      console.error('Error saving file:', error);
      return {
        success: false,
        error: `Failed to save file: ${error}`,
      };
    }
  } else {
    // If no current file, fallback to Save As
    return saveFileAs(content, htmlContent, defaultPath);
  }
}

/**
 * Save file with a new name/location
 */
export async function saveFileAs(
  content: string,
  htmlContent: string,
  defaultPath?: string
): Promise<SaveResult> {
  if (isElectron()) {
    return window.electronAPI.saveFileAs(content, htmlContent, defaultPath);
  }

  // Web implementation
  if (supportsFileSystemAccess()) {
    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: defaultPath || 'untitled.txt',
        types: [
          {
            description: 'Text Files',
            accept: {
              'text/plain': ['.txt'],
              'text/markdown': ['.md'],
            },
          },
        ],
      });

      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();

      const file = await fileHandle.getFile();
      currentFileHandle = { file, handle: fileHandle };

      return {
        success: true,
        filePath: file.name,
        fileName: file.name,
      };
    } catch (error) {
      console.error('Error saving file:', error);
      return {
        success: false,
        error: `Failed to save file: ${error}`,
      };
    }
  } else {
    // Fallback: trigger download
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultPath || 'untitled.txt';
      a.click();
      URL.revokeObjectURL(url);

      return {
        success: true,
        filePath: defaultPath || 'untitled.txt',
        fileName: defaultPath || 'untitled.txt',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to download file: ${error}`,
      };
    }
  }
}

/**
 * Create a new file (clear current state)
 */
export async function newFile(): Promise<void> {
  if (isElectron()) {
    return window.electronAPI.newFile();
  }

  // Web implementation
  currentFileHandle = null;
}

/**
 * Get current file path (web: file name)
 */
export async function getCurrentPath(): Promise<string | null> {
  if (isElectron()) {
    return window.electronAPI.getCurrentPath();
  }

  // Web implementation
  return currentFileHandle?.file.name || null;
}

/**
 * Set current file path (web: no-op)
 */
export async function setCurrentPath(filePath: string | null): Promise<void> {
  if (isElectron()) {
    return window.electronAPI.setCurrentPath(filePath);
  }

  // Web implementation: no-op
}

/**
 * Read directory contents (Electron only)
 */
export async function readDirectory(dirPath: string): Promise<DirectoryContents> {
  if (isElectron()) {
    return window.electronAPI.readDirectory(dirPath);
  }

  // Web: Not supported
  console.warn('Directory reading is not supported in web environment');
  return {
    items: [],
    path: dirPath,
  };
}

/**
 * Open file by path (Electron only)
 */
export async function openFileByPath(filePath: string): Promise<FileData | null> {
  if (isElectron()) {
    return window.electronAPI.openFileByPath(filePath);
  }

  // Web: Not supported
  console.warn('Opening file by path is not supported in web environment');
  return null;
}

/**
 * Select PDF file for embedding (Electron only for now)
 */
export async function selectPDFFile(): Promise<string | null> {
  if (isElectron()) {
    return window.electronAPI.selectPDFFile();
  }

  // Web implementation: Use file picker
  if (supportsFileSystemAccess()) {
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'PDF Documents',
            accept: {
              'application/pdf': ['.pdf'],
            },
          },
        ],
        multiple: false,
      });

      const file = await fileHandle.getFile();
      // For web, we return a blob URL since we can't return a file path
      return URL.createObjectURL(file);
    } catch (error) {
      console.error('Error selecting PDF:', error);
      return null;
    }
  }

  return null;
}

// Menu event handlers (Electron only)
export function onMenuNew(callback: () => void): () => void {
  if (isElectron()) {
    return window.electronAPI.onMenuNew(callback);
  }
  // Web: Return no-op cleanup
  return () => {};
}

export function onMenuSave(callback: () => void): () => void {
  if (isElectron()) {
    return window.electronAPI.onMenuSave(callback);
  }
  return () => {};
}

export function onMenuSaveAs(callback: () => void): () => void {
  if (isElectron()) {
    return window.electronAPI.onMenuSaveAs(callback);
  }
  return () => {};
}

export function onMenuUndo(callback: () => void): () => void {
  if (isElectron()) {
    return window.electronAPI.onMenuUndo(callback);
  }
  return () => {};
}

export function onMenuRedo(callback: () => void): () => void {
  if (isElectron()) {
    return window.electronAPI.onMenuRedo(callback);
  }
  return () => {};
}

export function onFileOpened(callback: (fileData: FileData) => void): () => void {
  if (isElectron()) {
    return window.electronAPI.onFileOpened(callback);
  }
  return () => {};
}
