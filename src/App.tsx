import { useState } from 'react';
import { useEditor } from './context/EditorContext';
import MenuBar from './components/MenuBar';
import TiptapEditor from './components/TiptapEditor';
import StatusBar from './components/StatusBar';
import ChatPanel from './components/ChatPanel';

function App() {
  const { currentFile } = useEditor();
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="app-container bg-gray-100">
      {/* Titlebar drag region for macOS */}
      <div className="titlebar-drag-region h-7 bg-gray-50 border-b border-gray-200 flex items-center justify-center">
        <span className="text-xs text-gray-500 font-medium">
          {currentFile ? currentFile.fileName : 'Untitled'} — Word Editor
        </span>
      </div>

      {/* Menu Bar */}
      <MenuBar onToggleChat={() => setIsChatOpen(!isChatOpen)} />

      {/* Main Editor Area */}
      <main className="flex-1 overflow-auto bg-gray-100 px-4">
        <div className="editor-page p-12">
          <TiptapEditor />
        </div>
      </main>

      {/* Status Bar */}
      <StatusBar />

      {/* Chat Panel */}
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}

export default App;
