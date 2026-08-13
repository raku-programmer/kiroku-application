import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@renderer/App';
import { AppDataProvider } from '@renderer/contexts/AppDataContext';
import { LoadingProvider } from '@renderer/contexts/LoadingContext';
import { ToastProvider } from '@renderer/contexts/ToastContext';
import '@renderer/styles/global.css';

const ROOT_ELEMENT_ID = 'root';

const container = document.getElementById(ROOT_ELEMENT_ID);
if (!container) {
  throw new Error(`#${ROOT_ELEMENT_ID} が見つかりません。`);
}

createRoot(container).render(
  <StrictMode>
    <ToastProvider>
      <LoadingProvider>
        <AppDataProvider>
          <App />
        </AppDataProvider>
      </LoadingProvider>
    </ToastProvider>
  </StrictMode>,
);
