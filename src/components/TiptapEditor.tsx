import { useEffect, useCallback, useRef } from 'react';
import { useEditor as useTiptapEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEditor } from '../context/EditorContext';
import { useTiptap } from '../context/TiptapContext';
import { PersistentSelection } from '../extensions/PersistentSelection';
import Toolbar from './Toolbar';

export default function TiptapEditor() {
  const {
    currentFile,
    setIsModified,
    updateCounts,
    handleSave,
    handleSaveAs,
    handleNew,
  } = useEditor();

  // Get the setEditor function from TiptapContext to register our editor
  const { setEditor: setTiptapEditor } = useTiptap();

  // Track the last loaded file path to avoid unnecessary reloads
  const lastLoadedPath = useRef<string | null>(null);

  // Initialize TipTap editor
  const editor = useTiptapEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your document...',
      }),
      PersistentSelection,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor prose-editor focus:outline-none min-h-[500px]',
      },
    },
    onUpdate: ({ editor }) => {
      setIsModified(true);
      
      // Update word and character counts
      const text = editor.state.doc.textContent;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      updateCounts(words, chars);
      
      // Log JSON structure (temporary)
      console.log('Editor JSON:', editor.getJSON());
    },
  });

  // Register the editor in the TiptapContext so ChatPanel can access it
  useEffect(() => {
    if (editor) {
      setTiptapEditor(editor);
    }
    // Cleanup: remove editor reference when component unmounts
    return () => {
      setTiptapEditor(null);
    };
  }, [editor, setTiptapEditor]);

  // Load content when file changes
  useEffect(() => {
    if (editor && currentFile) {
      // Only reload if it's a different file (different path)
      if (lastLoadedPath.current !== currentFile.filePath) {
        if (currentFile.isHtml) {
          // Load HTML content (from .docx)
          editor.commands.setContent(currentFile.content);
        } else if (currentFile.fileType === 'md') {
          // For markdown, we'll load as plain text for now
          // In a more advanced version, you'd parse markdown to HTML
          editor.commands.setContent(`<p>${currentFile.content.replace(/\n/g, '</p><p>')}</p>`);
        } else {
          // Plain text - wrap in paragraphs
          const htmlContent = currentFile.content
            .split('\n')
            .map(line => `<p>${line || '<br>'}</p>`)
            .join('');
          editor.commands.setContent(htmlContent);
        }
        
        lastLoadedPath.current = currentFile.filePath;
        
        // Update counts after loading
        const text = editor.state.doc.textContent;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        updateCounts(words, chars);
      }
    }
  }, [currentFile, editor, updateCounts]);

  // Clear editor when creating new file
  useEffect(() => {
    if (editor && !currentFile) {
      editor.commands.clearContent();
      lastLoadedPath.current = null;
      updateCounts(0, 0);
    }
  }, [currentFile, editor, updateCounts]);

  // Get content for saving
  const getContent = useCallback(() => {
    if (!editor) return { text: '', html: '' };
    
    const html = editor.getHTML();
    const text = editor.state.doc.textContent;
    
    return { text, html };
  }, [editor]);

  // Handle menu events
  useEffect(() => {
    const cleanupNew = window.electronAPI.onMenuNew(() => {
      handleNew();
    });

    const cleanupSave = window.electronAPI.onMenuSave(() => {
      const { text, html } = getContent();
      handleSave(text, html);
    });

    const cleanupSaveAs = window.electronAPI.onMenuSaveAs(() => {
      const { text, html } = getContent();
      handleSaveAs(text, html);
    });

    const cleanupUndo = window.electronAPI.onMenuUndo(() => {
      editor?.commands.undo();
    });

    const cleanupRedo = window.electronAPI.onMenuRedo(() => {
      editor?.commands.redo();
    });

    return () => {
      cleanupNew();
      cleanupSave();
      cleanupSaveAs();
      cleanupUndo();
      cleanupRedo();
    };
  }, [editor, getContent, handleNew, handleSave, handleSaveAs]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="editor-wrapper">
      <Toolbar editor={editor} onSave={() => {
        const { text, html } = getContent();
        handleSave(text, html);
      }} />
      <EditorContent editor={editor} />
    </div>
  );
}
