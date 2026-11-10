import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { StandAnbieter } from './ui/kontext';
import './stil.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StandAnbieter>
      <App />
    </StandAnbieter>
  </StrictMode>,
);
