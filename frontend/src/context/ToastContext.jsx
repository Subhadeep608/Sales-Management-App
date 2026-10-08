import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;
const DISPLAY_MS = 5000;
const EXIT_MS = 300;

const TOAST_STYLES = {
  success: { bg: 'bg-gradient-to-br from-brand-600 to-brand-500', icon: '🔔' },
  error: { bg: 'bg-gradient-to-br from-red-600 to-red-500', icon: '⚠️' },
};

function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleDismiss, DISPLAY_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), EXIT_MS);
  };

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    startTimer();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pause = () => clearTimeout(timerRef.current);
  // Mouse leaving restarts the full countdown, so the person gets a fresh
  // 5 seconds to finish reading after they look away.
  const resume = () => startTimer();

  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.success;

  return (
    <div
      onMouseEnter={pause}
      onMouseLeave={resume}
      className={`${style.bg} text-white rounded-xl shadow-2xl ring-1 ring-black/5 px-4 py-4 pr-9 relative flex items-start gap-3 cursor-default transition-all duration-300 ease-out transform ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'
        }`}
    >
      <span className="text-lg leading-none shrink-0 mt-0.5">{style.icon}</span>
      <p className="text-md font-medium leading-snug">{toast.message}</p>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-white/70 hover:text-white text-sm leading-none"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 left-4 z-50 space-y-3 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);