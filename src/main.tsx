import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initMocks } from './mocks';

// Initialize API mocks for local development and offline testing
initMocks();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
