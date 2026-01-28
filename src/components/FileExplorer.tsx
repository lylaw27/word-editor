import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { cn } from '../lib/utils';

interface FileExplorerProps {
  isOpen: boolean;
}

interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isExpanded?: boolean;
}

export default function FileExplorer({ isOpen }: FileExplorerProps) {
  const { currentFile } = useEditor();
  const [directoryTree, setDirectoryTree] = useState<DirectoryItem[]>([]);

  useEffect(() => {
    if (currentFile?.filePath) {
      // Parse the file path to extract directory structure
      const pathParts = currentFile.filePath.split('/').filter(Boolean);
      const tree: DirectoryItem[] = [];
      
      // Build directory tree from path
      let currentPath = '';
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        currentPath += '/' + part;
        const isLastItem = i === pathParts.length - 1;
        
        tree.push({
          name: part,
          path: currentPath,
          isDirectory: !isLastItem,
          isExpanded: true,
        });
      }
      
      setDirectoryTree(tree);
    } else {
      setDirectoryTree([]);
    }
  }, [currentFile]);

  const toggleExpand = (index: number) => {
    setDirectoryTree(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, isExpanded: !item.isExpanded } : item
      )
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
        {directoryTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <Folder size={32} className="text-gray-400 mb-2" />
            <p className="text-xs text-gray-500">
              No file opened
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {directoryTree.map((item, index) => {
              const depth = index;
              const isVisible = index === 0 || directoryTree
                .slice(0, index)
                .every(prev => prev.isExpanded);

              if (!isVisible) return null;

              return (
                <div
                  key={item.path}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-sm hover:bg-gray-200 cursor-pointer transition-colors",
                    !item.isDirectory && "bg-blue-50 hover:bg-blue-100"
                  )}
                  style={{ paddingLeft: `${depth * 12 + 8}px` }}
                  onClick={() => item.isDirectory && toggleExpand(index)}
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
                      <File size={14} className="text-gray-600 flex-shrink-0" />
                    </>
                  )}
                  <span className={cn(
                    "truncate text-xs",
                    item.isDirectory ? "text-gray-700 font-medium" : "text-gray-900"
                  )}>
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
