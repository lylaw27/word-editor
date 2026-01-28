import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { EditorProvider } from './context/EditorContext';
import { TiptapProvider } from './context/TiptapContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EditorProvider>
      <TiptapProvider>
        <App />
      </TiptapProvider>
    </EditorProvider>
  </React.StrictMode>
);
