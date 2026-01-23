import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

// Suppress 401 errors in console for production
if (import.meta.env.PROD) {
  const originalError = console.error;
  console.error = (...args) => {
    // Filter out 401 errors and network errors related to authentication
    const errorString = args.join(' ');
    if (
      errorString.includes('401') ||
      errorString.includes('Unauthorized') ||
      errorString.includes('Failed to load resource: the server responded with a status of 401')
    ) {
      return; // Don't log 401 errors
    }
    originalError.apply(console, args);
  };
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);