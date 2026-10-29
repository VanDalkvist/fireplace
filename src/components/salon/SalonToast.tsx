import React, { useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

interface SalonToastProps {
  message: string | null;
  onClose: () => void;
}

export const SalonToast: React.FC<SalonToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] sm:max-w-lg px-4 py-2.5 rounded-2xl bg-[#0a0705]/95 border border-primary/40 text-[#ece4d6] font-mono text-xs shadow-2xl backdrop-blur-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200 select-none pointer-events-auto"
    >
      <AlertCircle className="w-4 h-4 text-primary shrink-0" />
      <span className="flex-1 leading-snug text-left">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="p-1 -mr-1 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        title="Закрыть"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
