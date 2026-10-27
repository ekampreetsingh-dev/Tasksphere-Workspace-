"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, CircleX, Undo2 } from "lucide-react";
import { softSpring } from "./motion";

export type ToastKind = "success" | "error";

interface ToastAction {
  label: string;
  run: () => void;
}

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
  action?: ToastAction;
}

interface ToastValue {
  push: (message: string, kind?: ToastKind, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((message: string, kind: ToastKind = "success", action?: ToastAction) => {
    const id = nextId.current++;
    setItems((list) => [...list.slice(-3), { id, message, kind, action }]);
    window.setTimeout(() => {
      setItems((list) => list.filter((item) => item.id !== id));
    }, kind === "error" ? 6000 : 4200);
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-5 bottom-5 z-50 flex w-[min(340px,calc(100vw-28px))] flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={softSpring}
              className="panel flex items-center gap-2.5 px-3.5 py-3 text-[13px]"
              role="status"
            >
              <span className={item.kind === "error" ? "text-bad" : "text-good"} aria-hidden>
                {item.kind === "error" ? <CircleX size={15} /> : <CircleCheck size={15} />}
              </span>
              <span className="min-w-0 flex-1">{item.message}</span>
              {item.action && (
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-md border border-accent/40 bg-accent/15 px-2 py-1 text-[11px] font-bold text-accent"
                  onClick={() => {
                    item.action?.run();
                    dismiss(item.id);
                  }}
                >
                  <Undo2 size={11} aria-hidden />
                  {item.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
