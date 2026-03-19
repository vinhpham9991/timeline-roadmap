import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ isOpen, title, children, onClose }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-cyan-400/20 bg-slate-950/95 p-6 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
