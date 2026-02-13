'use client';

import { EditorProvider } from '@/context/EditorContext';
import { TiptapProvider } from '@/context/TiptapContext';
import App from '@/components/App';

export default function Home() {
  return (
    <EditorProvider>
      <TiptapProvider>
        <App />
      </TiptapProvider>
    </EditorProvider>
  );
}
