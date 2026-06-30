'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warn';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastCtx {
  success: (msg: string) => void;
  error:   (msg: string) => void;
  info:    (msg: string) => void;
  warn:    (msg: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#0d1a0d', border: 'var(--safe)',   icon: '✓' },
  error:   { bg: '#1a0d0d', border: 'var(--danger)', icon: '✕' },
  info:    { bg: '#0d1220', border: 'var(--blue)',   icon: 'ℹ' },
  warn:    { bg: '#1a1508', border: 'var(--warn)',   icon: '⚠' },
};

const TEXT: Record<ToastType, string> = {
  success: 'var(--safe)',
  error:   'var(--danger)',
  info:    'var(--blue)',
  warn:    'var(--warn)',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const ctx: ToastCtx = {
    success: (m) => add('success', m),
    error:   (m) => add('error',   m),
    info:    (m) => add('info',    m),
    warn:    (m) => add('warn',    m),
  };

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = COLORS[t.type];
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 4, padding: '10px 14px',
              boxShadow: '0 4px 16px #00000055',
              minWidth: 260, maxWidth: 380,
              animation: 'toast-in .2s ease',
              pointerEvents: 'auto',
            }}>
              <span style={{ color: TEXT[t.type], fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                {c.icon}
              </span>
              <span style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.5 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
