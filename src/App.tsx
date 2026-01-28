import { useState } from 'react';
import { useEditor } from './context/EditorContext';
import MenuBar from './components/MenuBar';
import TiptapEditor from './components/TiptapEditor';
import StatusBar from './components/StatusBar';
import ChatPanel from './components/ChatPanel';
import FileExplorer from './components/FileExplorer';

function App() {
  const { currentFile } = useEditor();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);

  return (
    <div className="app-container bg-gray-100">
      {/* Titlebar drag region for macOS */}
      <div className="titlebar-drag-region h-7 bg-gray-50 border-b border-gray-200 flex items-center justify-center">
        <span className="text-xs text-gray-500 font-medium">
          {currentFile ? currentFile.fileName : 'Untitled'} — Word Editor
        </span>
      </div>

      {/* Menu Bar */}
      <MenuBar 
        onToggleChat={() => setIsChatOpen(!isChatOpen)} 
        onToggleExplorer={() => setIsExplorerOpen(!isExplorerOpen)}
      />

      {/* Main Content Area with Chat Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        <FileExplorer isOpen={isExplorerOpen} />
        
        {/* Main Editor Area */}
        <main className="flex-1 overflow-auto bg-gray-100 px-4">
          <div className="editor-page p-12">
            <TiptapEditor />
          </div>
        </main>
        
        {/* Chat Panel */}
        <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}

export default App;
