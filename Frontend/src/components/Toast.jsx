import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X, AlertCircle } from 'lucide-react';

const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast.autoClose) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-900/20 border-green-700/50';
      case 'error':
        return 'bg-red-900/20 border-red-700/50';
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-700/50';
      case 'info':
      default:
        return 'bg-blue-900/20 border-blue-700/50';
    }
  };

  return (
    <div
      className={`
        ${getBgColor()}
        border rounded-lg shadow-lg p-4 mb-3
        flex items-start gap-3
        w-full sm:min-w-[300px] sm:max-w-[500px]
        backdrop-blur-sm
        transform transition-all duration-300 ease-out
        animate-slide-in
      `}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className="text-sm font-semibold text-white mb-1">
            {toast.title}
          </h4>
        )}
        <p className="text-sm text-gray-300">
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
