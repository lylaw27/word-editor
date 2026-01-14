import { useEditor } from '../context/EditorContext';
import { FileText, Type } from 'lucide-react';

export default function StatusBar() {
  const { wordCount, characterCount, currentFile } = useEditor();

  // Determine file type badge
  const getFileTypeBadge = () => {
    if (!currentFile) return null;
    
    const typeColors: Record<string, string> = {
      txt: 'bg-gray-200 text-gray-700',
      md: 'bg-blue-100 text-blue-700',
      docx: 'bg-indigo-100 text-indigo-700',
    };

    const typeLabels: Record<string, string> = {
      txt: 'Plain Text',
      md: 'Markdown',
      docx: 'Word Document',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[currentFile.fileType]}`}>
        {typeLabels[currentFile.fileType]}
      </span>
    );
  };

  return (
    <div className="status-bar">
      {/* Left side - Word and character count */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <FileText size={14} className="text-gray-400" />
          <span>{wordCount.toLocaleString()} words</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Type size={14} className="text-gray-400" />
          <span>{characterCount.toLocaleString()} characters</span>
        </div>
      </div>

      {/* Right side - File type badge */}
      <div className="flex items-center gap-3">
        {getFileTypeBadge()}
      </div>
    </div>
  );
}
