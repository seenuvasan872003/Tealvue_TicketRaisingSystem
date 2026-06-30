// ============================================================
//  client/src/main.jsx  —  React Application Entry Point
// ============================================================
//  COMMANDS:
//    cd e:\Tealvue-task\client
//    npm run dev     → Start Vite dev server  → http://localhost:5173
//    npm run build   → Build for production   → dist/
//    npm run preview → Preview production build
//
//  OR from root (starts BOTH server + client):
//    cd e:\Tealvue-task
//    npm start
// ============================================================

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// [IMPORTANT] Global styles — design tokens, CSS variables, component styles
import './index.css'

// [IMPORTANT] Root App component — contains Router + AuthProvider + Routes
import App from './App.jsx'

// [LOGGING] Professional logger utility
import logger from './utils/logger.js'

// [MONITORING] Import production monitoring tools
import * as Sentry from '@sentry/react';
import LogRocket from 'logrocket';

// Initialize Sentry for production error tracking
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "https://placeholder-dsn@sentry.io/placeholder",
  integrations: [],
  tracesSampleRate: 1.0,
});

// Initialize LogRocket for session replay
LogRocket.init(import.meta.env.VITE_LOGROCKET_PROJECT_ID || 'tealvue/ticket-raising-system');


// ── Global unhandled error listeners ──────────────────────────
// Catches any error not caught by a try/catch in the app
window.addEventListener('error', (event) => {
  logger.error('main', 'window.onerror', event.message, event.error, {
    action: 'Uncaught Global Error',
  });
});

// Catches unhandled Promise rejections (e.g. missing await on async calls)
window.addEventListener('unhandledrejection', (event) => {
  logger.error('main', 'window.onunhandledrejection', String(event.reason), event.reason instanceof Error ? event.reason : null, {
    action: 'Unhandled Promise Rejection',
  });
});

logger.initialize('Application');

// [IMPORTANT] Mount React app to #root div in index.html
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
