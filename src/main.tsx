import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * Static hosting (GitHub Pages) answers unknown deep links with 404.html, which
 * redirects to the app root as `?__route=/original/path?query`. Restore that
 * route before the router starts. replaceState is same-origin by definition;
 * the check below additionally rejects protocol-relative values.
 */
function restoreDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const route = params.get('__route');
  if (route === null) return;
  const safe = route.startsWith('/') && !route.startsWith('//') && !route.includes('\\') ? route : '/';
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  window.history.replaceState(null, '', base + safe + window.location.hash);
}

async function bootstrap() {
  restoreDeepLink();
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
