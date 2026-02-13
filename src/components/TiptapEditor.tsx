'use client'

import { useEffect, useCallback, useRef, useState } from 'react';
import { useEditor as useTiptapEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';
import Blockquote from '@tiptap/extension-blockquote';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { FontSize } from '../extensions/FontSize';
import { useEditor } from '../context/EditorContext';
import { useTiptap } from '../context/TiptapContext';
import { PersistentSelection } from '../extensions/PersistentSelection';
import Toolbar from './Toolbar';
import ChangeReviewOverlay from './ChangeReviewOverlay';
import { hasTrackedChanges, acceptAllChanges, rejectAllChanges } from '../utils/changeTracking';
import * as FileSystemAPI from '../../app/api/chat/filesystem';

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
  
  // Track whether to show the change review overlay
  const [showChangeOverlay, setShowChangeOverlay] = useState(false);

  // Initialize TipTap editor
  const editor = useTiptapEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your document...',
      }),
      Underline,
      Strike,
      Code,
      CodeBlock,
      Blockquote,
      HorizontalRule,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
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
      
      // Check if there are tracked changes and show overlay
      // Check both HTML and JSON to catch all change tracking methods
      const html = editor.getHTML();
      const json = editor.getJSON();
      if (hasTrackedChanges(html) || hasTrackedChanges(json)) {
        setShowChangeOverlay(true);
      } else {
        setShowChangeOverlay(false);
      }
      
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
    const cleanupNew = FileSystemAPI.onMenuNew(() => {
      handleNew();
    });

    const cleanupSave = FileSystemAPI.onMenuSave(() => {
      const { text, html } = getContent();
      handleSave(text, html);
    });

    const cleanupSaveAs = FileSystemAPI.onMenuSaveAs(() => {
      const { text, html } = getContent();
      handleSaveAs(text, html);
    });

    const cleanupUndo = FileSystemAPI.onMenuUndo(() => {
      editor?.commands.undo();
    });

    const cleanupRedo = FileSystemAPI.onMenuRedo(() => {
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

  const handleAcceptChanges = () => {
    const currentHTML = editor.getHTML();
    const cleanHTML = acceptAllChanges(currentHTML);
    editor.commands.setContent(cleanHTML);
    setShowChangeOverlay(false);
  };

  const handleRejectChanges = () => {
    const currentHTML = editor.getHTML();
    const originalHTML = rejectAllChanges(currentHTML);
    editor.commands.setContent(originalHTML);
    setShowChangeOverlay(false);
  };

  return (
    <div className="editor-wrapper">
      <Toolbar editor={editor} onSave={() => {
        const { text, html } = getContent();
        handleSave(text, html);
      }} />
      <EditorContent editor={editor} />
      
      {/* Change Review Overlay */}
      {showChangeOverlay && (
        <ChangeReviewOverlay
          editor={editor}
          html={editor.getHTML()}
          onAccept={handleAcceptChanges}
          onReject={handleRejectChanges}
          onClose={() => setShowChangeOverlay(false)}
        />
      )}
    </div>
  );
}
