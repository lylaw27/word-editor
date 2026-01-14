// File data returned when opening a file
export interface FileData {
  content: string;
  filePath: string;
  fileName: string;
  fileType: 'txt' | 'md' | 'docx';
  isHtml: boolean;
}

// Result from save operations
export interface SaveResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
}

// File filter types for dialogs
export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface FileFilters {
  all: FileFilter[];
  txt: FileFilter[];
  md: FileFilter[];
  docx: FileFilter[];
}

// The API exposed to the renderer via contextBridge
export interface ElectronAPI {
  // File operations
  openFile: () => Promise<FileData | null>;
  saveFile: (content: string, htmlContent: string, defaultPath?: string) => Promise<SaveResult>;
  saveFileAs: (content: string, htmlContent: string, defaultPath?: string) => Promise<SaveResult>;
  newFile: () => Promise<void>;
  getCurrentPath: () => Promise<string | null>;
  setCurrentPath: (filePath: string | null) => Promise<void>;

  // Menu event listeners (return cleanup functions)
  onMenuNew: (callback: () => void) => () => void;
  onMenuSave: (callback: () => void) => () => void;
  onMenuSaveAs: (callback: () => void) => () => void;
  onMenuUndo: (callback: () => void) => () => void;
  onMenuRedo: (callback: () => void) => () => void;
  onFileOpened: (callback: (fileData: FileData) => void) => () => void;
}

// Extend the Window interface to include our API
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Editor state for React context
export interface EditorState {
  currentFile: FileData | null;
  isModified: boolean;
  wordCount: number;
  characterCount: number;
}

// Editor context actions
export interface EditorContextValue extends EditorState {
  setCurrentFile: (file: FileData | null) => void;
  setIsModified: (modified: boolean) => void;
  updateCounts: (wordCount: number, characterCount: number) => void;
  handleNew: () => Promise<void>;
  handleOpen: () => Promise<void>;
  handleSave: (content: string, htmlContent: string) => Promise<void>;
  handleSaveAs: (content: string, htmlContent: string) => Promise<void>;
}
