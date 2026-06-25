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

// [IMPORTANT] Mount React app to #root div in index.html
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
