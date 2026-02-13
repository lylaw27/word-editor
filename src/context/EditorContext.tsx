import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { FileData, EditorContextValue } from '../../electron/types';
import * as FileSystemAPI from '../api/filesystem';

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

interface EditorProviderProps {
  children: ReactNode;
}

export function EditorProvider({ children }: EditorProviderProps) {
  const [currentFile, setCurrentFile] = useState<FileData | null>(null);
  const [isModified, setIsModified] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);

  // Update word and character counts
  const updateCounts = useCallback((words: number, chars: number) => {
    setWordCount(words);
    setCharacterCount(chars);
  }, []);

  // Handle creating a new file
  const handleNew = useCallback(async () => {
    // In a real app, you might want to prompt to save first if modified
    await FileSystemAPI.newFile();
    setCurrentFile(null);
    setIsModified(false);
    setWordCount(0);
    setCharacterCount(0);
  }, []);

  // Handle opening a file
  const handleOpen = useCallback(async () => {
    const fileData = await FileSystemAPI.openFile();
    if (fileData) {
      setCurrentFile(fileData);
      setIsModified(false);
    }
  }, []);

  // Handle saving the current file
  const handleSave = useCallback(async (content: string, htmlContent: string) => {
    const result = await FileSystemAPI.saveFile(
      content,
      htmlContent,
      currentFile?.fileName
    );

    if (result.success && result.filePath && result.fileName) {
      // Determine file type from extension
      const ext = result.filePath.split('.').pop()?.toLowerCase() || 'txt';
      const fileType = ext === 'docx' ? 'docx' : ext === 'md' ? 'md' : 'txt';

      // Always store HTML content in state to preserve formatting
      setCurrentFile({
        content: htmlContent,
        filePath: result.filePath!,
        fileName: result.fileName!,
        fileType: fileType as 'txt' | 'md' | 'docx',
        isHtml: true, // Always true in state to preserve formatting
      });
      setIsModified(false);
    }
  }, [currentFile]);

  // Handle save as
  const handleSaveAs = useCallback(async (content: string, htmlContent: string) => {
    const result = await FileSystemAPI.saveFileAs(
      content,
      htmlContent,
      currentFile?.fileName
    );

    if (result.success && result.filePath && result.fileName) {
      // Determine file type from extension
      const ext = result.filePath.split('.').pop()?.toLowerCase() || 'txt';
      const fileType = ext === 'docx' ? 'docx' : ext === 'md' ? 'md' : 'txt';

      // Always store HTML content in state to preserve formatting
      setCurrentFile({
        content: htmlContent,
        filePath: result.filePath!,
        fileName: result.fileName!,
        fileType: fileType as 'txt' | 'md' | 'docx',
        isHtml: true, // Always true in state to preserve formatting
      });
      setIsModified(false);
    }
  }, [currentFile]);

  // Listen for file opened from main process menu
  useEffect(() => {
    const cleanup = FileSystemAPI.onFileOpened((fileData: FileData) => {
      setCurrentFile(fileData);
      setIsModified(false);
    });

    return cleanup;
  }, []);

  const value: EditorContextValue = {
    currentFile,
    isModified,
    wordCount,
    characterCount,
    setCurrentFile,
    setIsModified,
    updateCounts,
    handleNew,
    handleOpen,
    handleSave,
    handleSaveAs,
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}
