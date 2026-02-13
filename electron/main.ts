import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import isDev from 'electron-is-dev';
import serve from 'electron-serve';
import mammoth from 'mammoth';
// import HTMLtoDOCX from 'html-to-docx';
import { FileData, SaveResult, FileFilters } from './types';
import { createAPIServer } from '../src/api/chat';

// Setup serve for production builds
const loadURL = serve({ directory: 'out' });

let mainWindow: BrowserWindow | null = null;
let currentFilePath: string | null = null;
let apiServer: any = null;

// File filter configurations
const fileFilters: FileFilters = {
  all: [
    { name: 'All Supported Files', extensions: ['txt', 'md', 'docx'] },
    { name: 'Text Files', extensions: ['txt'] },
    { name: 'Markdown Files', extensions: ['md'] },
    { name: 'Word Documents', extensions: ['docx'] },
  ],
  txt: [{ name: 'Text Files', extensions: ['txt'] }],
  md: [{ name: 'Markdown Files', extensions: ['md'] }],
  docx: [{ name: 'Word Documents', extensions: ['docx'] }],
};

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#f5f5f5',
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    await loadURL(mainWindow);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up application menu
  createApplicationMenu();
}

function createApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-new'),
        },
        { type: 'separator' },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => handleOpenFile(),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-save'),
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu-save-as'),
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow?.webContents.send('menu-undo'),
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => mainWindow?.webContents.send('menu-redo'),
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Open file dialog and read file
async function handleOpenFile(): Promise<void> {
  if (!mainWindow) return;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: fileFilters.all,
  });

  if (result.canceled || result.filePaths.length === 0) return;

  const filePath = result.filePaths[0];
  const fileData = await readFile(filePath);
  
  if (fileData) {
    currentFilePath = filePath;
    mainWindow.webContents.send('file-opened', fileData);
  }
}

// Read file based on extension
async function readFile(filePath: string): Promise<FileData | null> {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    if (ext === '.docx') {
      // Handle DOCX files with mammoth
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.convertToHtml({ buffer });
      return {
        content: result.value,
        filePath,
        fileName,
        fileType: 'docx',
        isHtml: true,
      };
    } else if (ext === '.md') {
      // Handle Markdown files
      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        content,
        filePath,
        fileName,
        fileType: 'md',
        isHtml: false,
      };
    } else {
      // Handle plain text files (.txt and others)
      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        content,
        filePath,
        fileName,
        fileType: 'txt',
        isHtml: false,
      };
    }
  } catch (error) {
    console.error('Error reading file:', error);
    dialog.showErrorBox('Error', `Failed to open file: ${error}`);
    return null;
  }
}

// Save file to disk
async function saveFile(
  filePath: string,
  content: string,
  htmlContent: string
): Promise<SaveResult> {
  try {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.docx') {
      // TODO: Fix HTMLtoDOCX import issue
      return {
        success: false,
        error: 'DOCX saving temporarily disabled',
      };
      // Convert HTML to DOCX
      // const docxBuffer = await HTMLtoDOCX(htmlContent, null, {
      //   table: { row: { cantSplit: true } },
      //   footer: true,
      //   pageNumber: true,
      // });
      // 
      // fs.writeFileSync(filePath, Buffer.from(docxBuffer as ArrayBuffer));
    } else {
      // Save as plain text (txt or md)
      fs.writeFileSync(filePath, content, 'utf-8');
    }

    currentFilePath = filePath;
    return {
      success: true,
      filePath,
      fileName: path.basename(filePath),
    };
  } catch (error) {
    console.error('Error saving file:', error);
    return {
      success: false,
      error: `Failed to save file: ${error}`,
    };
  }
}

// IPC Handlers
ipcMain.handle('dialog:open', async (): Promise<FileData | null> => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: fileFilters.all,
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  return readFile(result.filePaths[0]);
});

ipcMain.handle(
  'dialog:save',
  async (
    _event,
    { content, htmlContent, defaultPath }: { content: string; htmlContent: string; defaultPath?: string }
  ): Promise<SaveResult> => {
    if (!mainWindow) return { success: false, error: 'No window available' };

    // If we have a current file path, save directly
    if (currentFilePath) {
      return saveFile(currentFilePath, content, htmlContent);
    }

    // Otherwise, show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultPath || 'untitled.txt',
      filters: fileFilters.all,
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Save cancelled' };
    }

    return saveFile(result.filePath, content, htmlContent);
  }
);

ipcMain.handle(
  'dialog:saveAs',
  async (
    _event,
    { content, htmlContent, defaultPath }: { content: string; htmlContent: string; defaultPath?: string }
  ): Promise<SaveResult> => {
    if (!mainWindow) return { success: false, error: 'No window available' };

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultPath || currentFilePath || 'untitled.txt',
      filters: fileFilters.all,
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Save cancelled' };
    }

    return saveFile(result.filePath, content, htmlContent);
  }
);

ipcMain.handle('file:new', async (): Promise<void> => {
  currentFilePath = null;
  mainWindow?.setTitle('Word Editor - Untitled');
});

ipcMain.handle('file:getCurrentPath', (): string | null => {
  return currentFilePath;
});

ipcMain.handle('file:setCurrentPath', (_event, filePath: string | null): void => {
  currentFilePath = filePath;
});

ipcMain.handle('directory:read', async (_event, dirPath: string) => {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    const directoryItems = items
      .filter(item => {
        if (item.isDirectory()) return true;
        // Filter for .docx and .pdf files
        const ext = path.extname(item.name).toLowerCase();
        return ext === '.docx' || ext === '.pdf';
      })
      .map(item => ({
        name: item.name,
        path: path.join(dirPath, item.name),
        isDirectory: item.isDirectory(),
        extension: item.isDirectory() ? undefined : path.extname(item.name).toLowerCase(),
      }))
      .sort((a, b) => {
        // Directories first, then alphabetically
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    
    return {
      items: directoryItems,
      path: dirPath,
    };
  } catch (error) {
    console.error('Error reading directory:', error);
    return {
      items: [],
      path: dirPath,
    };
  }
});

ipcMain.handle('file:openByPath', async (_event, filePath: string): Promise<FileData | null> => {
  const fileData = await readFile(filePath);
  
  if (fileData && mainWindow) {
    currentFilePath = filePath;
    mainWindow.webContents.send('file-opened', fileData);
  }
  
  return fileData;
});

ipcMain.handle('dialog:selectPDF', async (): Promise<string | null> => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  return result.filePaths[0];
});

// App lifecycle events
app.whenReady().then(() => {
  // Start API server only if not already running
  if (!apiServer) {
    apiServer = createAPIServer(3001);
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Close API server
  if (apiServer) {
    apiServer.close();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
