import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

async function bootstrap() {
  // The mock backend is only bundled into the critical path in demo mode;
  // with VITE_USE_MOCK=false it is never loaded and requests go to the real API.
  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    const { initMocks } = await import('./mocks');
    initMocks();
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
