import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, FileText } from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { cn } from '../lib/utils';
import { isElectron } from '../utils/platform';
import { readDirectory, openFileByPath } from '../api/filesystem';
import * as path from 'path-browserify';

interface FileExplorerProps {
  isOpen: boolean;
}

interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isExpanded?: boolean;
  extension?: string;
  children?: DirectoryItem[];
}

export default function FileExplorer({ isOpen }: FileExplorerProps) {
  const { currentFile } = useEditor();
  const [directoryTree, setDirectoryTree] = useState<DirectoryItem[]>([]);

  // Load directory contents
  const loadDirectory = async (dirPath: string, targetPath?: string) => {
    try {
      const result = await readDirectory(dirPath);
      
      const items: DirectoryItem[] = result.items.map(item => ({
        name: item.name,
        path: item.path,
        isDirectory: item.isDirectory,
        extension: item.extension,
        isExpanded: targetPath ? targetPath.startsWith(item.path) : false,
        children: undefined,
      }));
      
      // If we have a target path, recursively expand the directories
      if (targetPath) {
        for (const item of items) {
          if (item.isDirectory && targetPath.startsWith(item.path)) {
            const childResult = await loadDirectory(item.path, targetPath);
            item.children = childResult;
          }
        }
      }
      
      return items;
    } catch (error) {
      console.error('Error loading directory:', error);
      return [];
    }
  };

  useEffect(() => {
    const initializeExplorer = async () => {
      if (currentFile?.filePath) {
        // Get the directory of the current file
        const dirPath = path.dirname(currentFile.filePath);
        
        // Load the directory contents and expand to show current file
        const items = await loadDirectory(dirPath, currentFile.filePath);
        setDirectoryTree(items);
      } else {
        setDirectoryTree([]);
      }
    };
    
    initializeExplorer();
  }, [currentFile]);

  const toggleExpand = async (item: DirectoryItem, itemPath: DirectoryItem[]) => {
    if (!item.isDirectory) return;
    
    const newTree = [...directoryTree];
    let current = newTree;
    
    // Navigate to the item in the tree
    for (let i = 0; i < itemPath.length - 1; i++) {
      const idx = current.findIndex(it => it.path === itemPath[i].path);
      if (idx !== -1 && current[idx].children) {
        current = current[idx].children!;
      }
    }
    
    const idx = current.findIndex(it => it.path === item.path);
    if (idx !== -1) {
      const targetItem = current[idx];
      targetItem.isExpanded = !targetItem.isExpanded;
      
      // Load children if expanding and not loaded yet
      if (targetItem.isExpanded && !targetItem.children) {
        targetItem.children = await loadDirectory(targetItem.path);
      }
    }
    
    setDirectoryTree(newTree);
  };

  const handleFileClick = async (item: DirectoryItem) => {
    if (!item.isDirectory && (item.extension === '.docx' || item.extension === '.pdf')) {
      try {
        await openFileByPath(item.path);
        // The file will be opened via the onFileOpened listener in EditorContext
      } catch (error) {
        console.error('Error opening file:', error);
      }
    }
  };

  const renderItem = (item: DirectoryItem, depth: number, itemPath: DirectoryItem[]): JSX.Element | null => {
    const currentPath = [...itemPath, item];
    
    return (
      <div key={item.path}>
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-sm hover:bg-gray-200 cursor-pointer transition-colors",
            !item.isDirectory && currentFile?.filePath === item.path && "bg-blue-50 hover:bg-blue-100"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => item.isDirectory ? toggleExpand(item, currentPath) : handleFileClick(item)}
        >
          {item.isDirectory ? (
            <>
              {item.isExpanded ? (
                <ChevronDown size={14} className="text-gray-600 flex-shrink-0" />
              ) : (
                <ChevronRight size={14} className="text-gray-600 flex-shrink-0" />
              )}
              {item.isExpanded ? (
                <FolderOpen size={14} className="text-blue-500 flex-shrink-0" />
              ) : (
                <Folder size={14} className="text-blue-500 flex-shrink-0" />
              )}
            </>
          ) : (
            <>
              <div className="w-3.5" /> {/* Spacer for alignment */}
              {item.extension === '.docx' ? (
                <FileText size={14} className="text-blue-600 flex-shrink-0" />
              ) : item.extension === '.pdf' ? (
                <File size={14} className="text-red-600 flex-shrink-0" />
              ) : (
                <File size={14} className="text-gray-600 flex-shrink-0" />
              )}
            </>
          )}
          <span className={cn(
            "truncate text-xs",
            item.isDirectory ? "text-gray-700 font-medium" : "text-gray-900"
          )}>
            {item.name}
          </span>
        </div>
        
        {/* Render children if directory is expanded */}
        {item.isDirectory && item.isExpanded && item.children && (
          <div>
            {item.children.map(child => renderItem(child, depth + 1, currentPath))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
        isOpen ? "w-64" : "w-0"
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 bg-white">
        <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Explorer
        </h2>
      </div>

      {/* Directory Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {!isElectron() ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <Folder size={32} className="text-gray-400 mb-2" />
            <p className="text-xs text-gray-500">
              File explorer is not available in web mode
            </p>
          </div>
        ) : directoryTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <Folder size={32} className="text-gray-400 mb-2" />
            <p className="text-xs text-gray-500">
              No file opened
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {directoryTree.map(item => renderItem(item, 0, []))}
          </div>
        )}
      </div>
    </div>
  );
}
