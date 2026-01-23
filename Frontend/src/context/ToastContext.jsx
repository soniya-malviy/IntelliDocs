import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', options = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type,
      title: options.title,
      duration: options.duration || 5000,
      autoClose: options.autoClose !== false,
    };

    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message, options = {}) => {
    return showToast(message, 'success', { title: 'Success', ...options });
  }, [showToast]);

  const error = useCallback((message, options = {}) => {
    return showToast(message, 'error', { title: 'Error', ...options });
  }, [showToast]);

  const warning = useCallback((message, options = {}) => {
    return showToast(message, 'warning', { title: 'Warning', ...options });
  }, [showToast]);

  const info = useCallback((message, options = {}) => {
    return showToast(message, 'info', { title: 'Info', ...options });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info, showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end pointer-events-none max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto w-full sm:w-auto">
            <Toast toast={toast} onClose={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
