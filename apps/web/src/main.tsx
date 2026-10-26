import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Self-hosted fonts: the app must work on a LAN with no internet.
// Inter for the interface, Literata for the document the scribe writes and reads.
import '@fontsource-variable/inter';
import '@fontsource-variable/literata';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
