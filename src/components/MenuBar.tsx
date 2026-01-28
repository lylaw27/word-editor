import { useEditor } from '../context/EditorContext';
import {
  File,
  FolderOpen,
  Save,
  FilePlus,
  MessageSquare,
  PanelLeft,
} from 'lucide-react';

export default function MenuBar({ 
  onToggleChat, 
  onToggleExplorer 
}: { 
  onToggleChat: () => void;
  onToggleExplorer: () => void;
}) {
  const { handleNew, handleOpen, currentFile, isModified } = useEditor();

  return (
    <div className="menu-bar titlebar-no-drag">
      <div className="flex items-center gap-2">
        {/* Explorer Toggle */}
        <button
          onClick={onToggleExplorer}
          className="menu-item flex items-center gap-2"
          title="Toggle Explorer"
        >
          <PanelLeft size={16} />
        </button>

        <div className="w-px h-5 bg-gray-300" />

        {/* File Icon */}
        <div className="flex items-center gap-2 px-2 py-1 text-gray-600">
          <File size={16} />
          <span className="text-sm font-medium">
            {currentFile ? currentFile.fileName : 'Untitled'}
            {isModified && <span className="text-orange-500 ml-1">•</span>}
          </span>
        </div>

        <div className="w-px h-5 bg-gray-300" />

        {/* New */}
        <button
          onClick={handleNew}
          className="menu-item flex items-center gap-2"
          title="New Document (⌘N)"
        >
          <FilePlus size={16} />
          <span>New</span>
        </button>

        {/* Open */}
        <button
          onClick={handleOpen}
          className="menu-item flex items-center gap-2"
          title="Open File (⌘O)"
        >
          <FolderOpen size={16} />
          <span>Open</span>
        </button>

        {/* Save indicator */}
        {isModified && (
          <div className="flex items-center gap-1 px-2 py-1 text-orange-500 text-sm">
            <Save size={14} />
            <span>Unsaved</span>
          </div>
        )}
      </div>

      {/* Right side - File path and Chat button */}
      <div className="ml-auto flex items-center gap-3">
        <div className="text-xs text-gray-400 truncate max-w-md">
          {currentFile?.filePath || 'No file open'}
        </div>
        
        <div className="w-px h-5 bg-gray-300" />
        
        {/* AI Chat Button */}
        <button
          onClick={onToggleChat}
          className="menu-item flex items-center gap-2 text-blue-600 hover:text-blue-700"
          title="AI Assistant"
        >
          <MessageSquare size={16} />
          <span>AI Chat</span>
        </button>
      </div>
    </div>
  );
}
