import { useState, useRef, useCallback, useEffect } from 'react';
import { Database, Upload, FileText, CheckCircle, AlertCircle, Loader2, X, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { isElectron } from '../utils/platform';
import { selectPDFFile } from '../api/filesystem';

type EmbedStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

interface ProgressState {
  stage: string;
  message: string;
  progress: number;
  totalChunks?: number;
  processedChunks?: number;
}

interface EmbeddedDocument {
  id: string;
  fileName: string;
  totalChunks: number;
  status: string;
  createdAt: number;
}

export default function EmbedDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<EmbedStatus>('idle');
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [documents, setDocuments] = useState<EmbeddedDocument[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load documents list when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/embed/documents');
      if (response.ok) {
        const docs = await response.json();
        setDocuments(docs);
      }
    } catch {
      // Silently fail — documents list is optional
    }
  };

  const processFile = useCallback(async (filePathOrBlob: string | File) => {
    setStatus('processing');
    setError(null);
    setProgress({ stage: 'extracting', message: 'Processing PDF...', progress: 10 });

    try {
      let response: Response;

      if (typeof filePathOrBlob === 'string') {
        // Electron path-based upload
        response = await fetch('/api/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: filePathOrBlob }),
        });
      } else {
        // Web: upload file blob via FormData
        const formData = new FormData();
        formData.append('file', filePathOrBlob);
        response = await fetch('/api/embed', {
          method: 'POST',
          body: formData,
        });
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to process document');
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'progress') {
                setProgress({
                  stage: parsed.stage,
                  message: parsed.message,
                  progress: parsed.progress,
                  totalChunks: parsed.totalChunks,
                  processedChunks: parsed.processedChunks,
                });
              } else if (parsed.type === 'result') {
                // Backend already uploaded to Convex
                setProgress({
                  stage: 'done',
                  message: `Successfully embedded ${parsed.totalChunks} chunks!`,
                  progress: 100,
                  totalChunks: parsed.totalChunks,
                  processedChunks: parsed.totalChunks,
                });
                setStatus('done');
                loadDocuments();
              } else if (parsed.type === 'error') {
                throw new Error(parsed.message);
              }
            } catch (parseErr: any) {
              if (parseErr.message && !parseErr.message.includes('JSON')) {
                throw parseErr;
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Embedding error:', err);
      setError(err.message || 'Failed to process document');
      setStatus('error');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFile) {
      if (isElectron()) {
        // Electron: use native file path
        const filePath = (pdfFile as any).path;
        if (filePath && filePath.toLowerCase().endsWith('.pdf')) {
          processFile(filePath);
        } else {
          setError('Could not access file path.');
          setStatus('error');
        }
      } else {
        // Web: upload the file blob directly
        processFile(pdfFile);
      }
    } else {
      setError('Please drop a PDF file.');
      setStatus('error');
    }
  }, [processFile]);

  const handleFileSelect = useCallback(async () => {
    if (isElectron()) {
      const filePath = await selectPDFFile();
      if (filePath) {
        processFile(filePath);
      }
    } else {
      // Web: use file input picker
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          processFile(file);
        }
      };
      input.click();
    }
  }, [processFile]);

  const resetState = () => {
    setStatus('idle');
    setProgress(null);
    setError(null);
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await fetch(`/api/embed/documents/${docId}`, {
        method: 'DELETE',
      });
      loadDocuments();
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="menu-item flex items-center gap-1.5 text-purple-600 hover:text-purple-700"
        title="Embed Documents"
      >
        <Database size={16} />
        <span>Embed</span>
        <ChevronDown size={12} className={cn("transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Database size={14} className="text-purple-600" />
                Document Embeddings
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600" title="Close">
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Upload PDF documents to extract text and generate embeddings for AI search.
            </p>
          </div>

          {/* Drop Zone */}
          <div className="p-4">
            {status === 'idle' || status === 'error' || status === 'done' ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer",
                  isDragOver
                    ? "border-purple-400 bg-purple-50"
                    : "border-gray-300 hover:border-purple-300 hover:bg-purple-50/50"
                )}
                onClick={handleFileSelect}
              >
                {status === 'done' ? (
                  <>
                    <CheckCircle size={28} className="mx-auto text-green-500 mb-2" />
                    <p className="text-sm font-medium text-green-700">
                      {progress?.message || 'Embedding complete!'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Drop another PDF or click to select
                    </p>
                  </>
                ) : status === 'error' ? (
                  <>
                    <AlertCircle size={28} className="mx-auto text-red-500 mb-2" />
                    <p className="text-sm font-medium text-red-700">{error}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); resetState(); }}
                      className="text-xs text-purple-600 hover:text-purple-700 mt-2 underline"
                    >
                      Try again
                    </button>
                  </>
                ) : (
                  <>
                    <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-700">
                      Drop a PDF file here
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      or click to browse
                    </p>
                  </>
                )}
              </div>
            ) : (
              /* Processing State */
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="text-purple-600 animate-spin" />
                  <span className="text-sm font-medium text-gray-700">
                    {progress?.message || 'Processing...'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress?.progress || 0}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span>{progress?.stage}</span>
                  <span>{progress?.progress || 0}%</span>
                </div>

                {progress?.totalChunks && (
                  <p className="text-xs text-gray-500 text-center">
                    {progress.processedChunks || 0} / {progress.totalChunks} chunks
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Embedded Documents List */}
          {documents.length > 0 && (
            <div className="border-t border-gray-100">
              <div className="px-4 py-2 bg-gray-50">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Embedded Documents
                </h4>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={14} className="text-red-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">
                          {doc.fileName}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {doc.totalChunks} chunks · {doc.status === 'completed' ? '✓' : doc.status}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0"
                      title="Delete document"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
