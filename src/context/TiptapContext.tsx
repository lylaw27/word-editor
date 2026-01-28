/**
 * TipTap Editor Context
 * 
 * This context provides access to the TipTap editor instance throughout the app.
 * This is necessary so that the ChatPanel can execute AI tools on the editor
 * even though they're separate components.
 * 
 * The TiptapEditor component will set the editor instance, and ChatPanel
 * will consume it to execute tool commands.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Editor } from '@tiptap/react';

interface TiptapContextValue {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
}

const TiptapContext = createContext<TiptapContextValue | undefined>(undefined);

interface TiptapProviderProps {
  children: ReactNode;
}

/**
 * Provider component that wraps the app to share the TipTap editor instance
 */
export function TiptapProvider({ children }: TiptapProviderProps) {
  // Store the editor instance in state
  const [editor, setEditor] = useState<Editor | null>(null);

  return (
    <TiptapContext.Provider value={{ editor, setEditor }}>
      {children}
    </TiptapContext.Provider>
  );
}

/**
 * Hook to access the TipTap editor instance from any component
 */
export function useTiptap(): TiptapContextValue {
  const context = useContext(TiptapContext);
  if (context === undefined) {
    throw new Error('useTiptap must be used within a TiptapProvider');
  }
  return context;
}
