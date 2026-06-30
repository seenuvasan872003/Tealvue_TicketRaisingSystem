// ============================================================
//  client/src/utils/logger.js  —  Professional Logging Utility
// ============================================================
//  Provides structured, consistent logging across all pages,
//  components, services, and context files.
//
//  USAGE:
//    import logger from '../utils/logger';
//
//    logger.info('Dashboard', 'fetchDashboard', 'Fetching dashboard data');
//    logger.error('Login', 'handleSubmit', 'Login failed', err, { api: '/api/auth/login', method: 'POST', status: 401 });
//    logger.api('Dashboard', 'fetchStats', 'GET', '/api/tickets/stats', 'START');
//
//  PRODUCTION READY:
//    Set VITE_LOG_TO_BACKEND=true and VITE_LOG_API_URL=https://your-api.com/logs
//    to send errors to a backend log endpoint.
// ============================================================

const LOG_TO_BACKEND = true; // Enabled to store all log data in DB
const LOG_API_URL    = import.meta.env.VITE_LOG_API_URL || 'http://localhost:5000/api/logs/client';
const IS_DEV         = import.meta.env.DEV;

// ── Helpers ─────────────────────────────────────────────────

/** Format timestamp as: 30-06-2026 10:45 AM */
const formatTimestamp = () => {
  const now = new Date();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hrs  = now.getHours();
  const mins = String(now.getMinutes()).padStart(2, '0');
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  const h12  = hrs % 12 || 12;
  return `${dd}-${mm}-${yyyy} ${String(h12).padStart(2, '0')}:${mins} ${ampm}`;
};

/** Get current browser route */
const getCurrentRoute = () => window.location.pathname;

/** Pad label to fixed width for aligned output */
const pad = (label) => label.padEnd(10, ' ');

// [MONITORING] Import Sentry and LogRocket
import * as Sentry from '@sentry/react';
import LogRocket from 'logrocket';

// ── Send log to backend database & monitoring systems ───────────────────────────
const sendToBackend = async (logEntry) => {
  // 1. Log to Sentry & LogRocket depending on level
  try {
    if (logEntry.level === 'error') {
      Sentry.captureException(logEntry.stack !== '—' ? new Error(logEntry.message + '\n' + logEntry.stack) : new Error(logEntry.message), {
        extra: logEntry
      });
      LogRocket.captureMessage(`[ERROR] ${logEntry.message}`, {
        extra: logEntry
      });
    } else if (logEntry.level === 'warn') {
      LogRocket.captureMessage(`[WARN] ${logEntry.message}`, {
        extra: logEntry
      });
    } else {
      LogRocket.log(`[INFO] ${logEntry.message}`);
    }
  } catch (err) {
    // Silent
  }

  // 2. Log to Database via Custom Backend REST API (ONLY when user token exists)
  if (!LOG_TO_BACKEND) return;
  try {
    const token = localStorage.getItem('token');
    if (!token) return; // Only store in DB when user is logged in (authenticated)

    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    await fetch(LOG_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(logEntry),
    });
  } catch {
    // Silently fail — never throw from the logger itself
  }
};



// Helper to decode user info from JWT token stored in localStorage
const getUserFromToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return { name: 'Anonymous', id: 'None' };
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return { name: decoded.name || decoded.email || 'User', id: decoded.id || 'Unknown' };
  } catch (e) {
    return { name: 'Anonymous', id: 'None' };
  }
};

// ── Core Formatter ───────────────────────────────────────────

const log = (level, component, fn, message, error = null, meta = {}) => {
  const timestamp = formatTimestamp();
  const route     = getCurrentRoute();
  const file      = component ? `${component}.jsx` : 'Unknown';
  const user      = getUserFromToken();

  // Simplify complex error messages for easy understanding
  let simplifiedMessage = message;
  if (level === 'error' || error) {
    const rawMsg = (message || error?.message || '').toLowerCase();
    if (rawMsg.includes('objects are not valid as a react child')) {
      simplifiedMessage = 'React Render Error: Tried to display an object instead of text as HTML.';
    } else if (rawMsg.includes('cannot read properties of null') || rawMsg.includes('undefined')) {
      simplifiedMessage = `State Error: Tried to access empty properties (${message}).`;
    } else if (rawMsg.includes('network error') || rawMsg.includes('failed to fetch')) {
      simplifiedMessage = 'Connection Error: Failed to communicate with server api.';
    } else if (rawMsg.includes('401') || rawMsg.includes('unauthorized')) {
      simplifiedMessage = 'Session Expired: Please log in again.';
    } else if (rawMsg.includes('403') || rawMsg.includes('denied')) {
      simplifiedMessage = 'Access Denied: You do not have permissions for this action.';
    }
  }

  const entry = {
    timestamp,
    file,
    component,
    function: fn ? `${fn}()` : '—',
    api:      meta.api    || '—',
    method:   meta.method || '—',
    status:   meta.status || '—',
    message:  simplifiedMessage,
    stack:    error?.stack || '—',
    route,
    action:   meta.action || '—',
    user:     user.name,
    userId:   user.id
  };

  // User Requests: Only show/store the FIRST Login and FIRST Initialized log in the DB per session.
  let isDbMatch = false;
  
  if (level === 'error' || level === 'warn') {
    isDbMatch = true;
  } else if (meta.action === 'Login Success') {
    // Only log the first login event in DB per session
    if (!sessionStorage.getItem('db_logged_in')) {
      sessionStorage.setItem('db_logged_in', 'true');
      isDbMatch = true;
    }
  } else if (meta.action === 'App Initialization' || message.includes('Initialized') || message.includes('Initializing')) {
    // Only log the first application initialization in DB per session
    if (!sessionStorage.getItem('db_initialized')) {
      sessionStorage.setItem('db_initialized', 'true');
      isDbMatch = true;
    }
  }

  if (isDbMatch) {
    sendToBackend({ level, ...entry });
  }

  // Format Console Outputs (Enforcing Exact Requested Formatted Block Template)
  const block = [
    '========================================',
    `Time       : ${entry.timestamp}`,
    `File       : ${entry.file}`,
    `Component  : ${entry.component || '—'}`,
    `Function   : ${entry.function}`,
    `API        : ${entry.api}`,
    `Method     : ${entry.method}`,
    `Status     : ${entry.status}`,
    `Message    : ${entry.message}`,
    `Stack      : ${entry.stack}`,
    `Route      : ${entry.route}`,
    '========================================',
  ].join('\n');

  if (level === 'error') {
    console.error(block);
  } else if (level === 'warn') {
    console.warn(block);
  } else {
    console.log(block);
  }
};

// ── Public API (Requirement 8) ───────────────────────────────

const logger = {
  login: (username, userId, message = 'User logged in successfully.') => {
    log('info', 'AuthContext', 'login', message, null, { action: 'Login Success' });
  },

  initialize: (moduleName) => {
    log('info', moduleName, 'init', `${moduleName} Initialized`, null, { action: 'App Initialization' });
  },

  click: (component, actionName) => {
    log('info', component, null, `${actionName} button clicked`, null, { action: `${actionName} Click` });
  },

  api: (component, fn, method, apiUrl, stage, statusOrError = null) => {
    const isError  = stage === 'FAILURE';
    const status   = isError && statusOrError?.response?.status
      ? statusOrError.response.status
      : (stage === 'SUCCESS' ? 200 : '—');
    const message  = `[API ${stage}] ${method} ${apiUrl}`;
    const meta     = { api: apiUrl, method, status };
    log(
      isError ? 'error' : 'info',
      component,
      fn,
      message,
      isError ? statusOrError : null,
      meta
    );
  },

  success: (component, fn, message) => {
    log('info', component, fn, message);
  },

  warning: (component, fn, message) => {
    log('warn', component, fn, message);
  },

  error: (component, fn, message, error = null, meta = {}) => {
    log('error', component, fn, message, error, meta);
  },

  // Fallbacks for compatibility with previous changes
  info: (component, fn, message, meta = {}) => {
    if (message.includes('Initialized') || message.includes('initializing')) {
      log('info', component, fn, message, null, { ...meta, action: 'App Initialization' });
    } else {
      log('info', component, fn, message, null, meta);
    }
  },
  warn: (component, fn, message, meta = {}) => {
    log('warn', component, fn, message, null, meta);
  }
};

export default logger;

