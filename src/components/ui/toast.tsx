"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Small toast queue. Deliberately dependency-free: the app only needs
 * "the thing you just did worked / did not work" feedback.
 */
type ToastTone = "success" | "error" | "info" | "warning";

type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
};

type ToastContextValue = {
  toast: (input: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { icon: React.ElementType; className: string; iconClass: string }> = {
  success: { icon: CheckCircle2, className: "border-paid-200 bg-white", iconClass: "text-paid-600" },
  error: { icon: XCircle, className: "border-unpaid-200 bg-white", iconClass: "text-unpaid-600" },
  warning: { icon: AlertTriangle, className: "border-warn-200 bg-white", iconClass: "text-warn-600" },
  info: { icon: Info, className: "border-navy-200 bg-white", iconClass: "text-brand-600" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const counter = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (input: Omit<Toast, "id">) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current.slice(-3), { ...input, id }]);
      window.setTimeout(() => dismiss(id), input.tone === "error" ? 7000 : 4500);
    },
    [dismiss],
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ tone: "success", title, description }),
      error: (title, description) => toast({ tone: "error", title, description }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
        role="region"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((item) => {
          const tone = TONE_STYLES[item.tone];
          const Icon = tone.icon;
          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-[var(--shadow-overlay)] animate-in-rise",
                tone.className,
              )}
            >
              <Icon className={cn("mt-px size-5 shrink-0", tone.iconClass)} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-navy-900">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-navy-600">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded p-0.5 text-navy-400 transition-colors hover:bg-navy-100 hover:text-navy-700"
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>.");
  return context;
}
