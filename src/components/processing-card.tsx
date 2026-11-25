"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { WAITING_TIPS } from "@/lib/summarize";
import type { SourceMode } from "@/lib/types";
import { useSoftTransition } from "@/lib/use-soft-transition";

const LATER_STEPS = [
  "Распознавание речи и транскрибация...",
  "Выделение ключевых идей с помощью AI...",
] as const;

export function ProcessingCard({
  mode,
  stepIndex,
  onCancel,
}: {
  mode: SourceMode;
  stepIndex: number;
  onCancel: () => void;
}) {
  const transition = useSoftTransition();
  const [progress, setProgress] = useState(8);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (mode !== "file" || stepIndex > 0) return;
    const timer = window.setInterval(() => {
      setProgress((value) => Math.min(96, value + Math.random() * 11 + 4));
    }, 220);
    return () => window.clearInterval(timer);
  }, [mode, stepIndex]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTipIndex((index) => (index + 1) % WAITING_TIPS.length);
    }, 3400);
    return () => window.clearInterval(timer);
  }, []);

  const uploadProgress = stepIndex > 0 ? 100 : Math.round(progress);
  const labels = [
    mode === "file"
      ? `Загрузка видео... ${uploadProgress}%`
      : "Получение аудиодорожки видео...",
    LATER_STEPS[0],
    LATER_STEPS[1],
  ];
  const bar = stepIndex >= 3 ? 100 : 8 + Math.min(stepIndex, 2) * 30;

  return (
    <section className="mx-auto mt-6 w-full max-w-2xl rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-ink">Готовим выжимку</h2>
          <p className="mt-1 text-sm leading-relaxed text-secondary">
            Показ сценария. Файл и ссылка не отправляются на сервер.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer text-sm text-secondary hover:text-ink"
        >
          Отмена
        </button>
      </div>

      <ol aria-live="polite" className="mt-5 space-y-3">
        {labels.map((label, index) => {
          const done = index < stepIndex;
          const active = index === stepIndex;
          return (
            <li key={index} className="flex items-center gap-3">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border",
                  done && "border-success/30 bg-success/15 text-success",
                  active && "border-accent/40 text-accent",
                  !done && !active && "border-line text-faint",
                )}
              >
                {done ? (
                  <Check className="size-3.5" />
                ) : active ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              <span className={cn("text-sm", active || done ? "text-ink" : "text-faint")}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 h-1 overflow-hidden rounded-full bg-elevated">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ width: `${bar}%` }}
        />
      </div>

      <div className="mt-5 space-y-2">
        <div className="shimmer h-3 w-11/12 rounded" />
        <div className="shimmer h-3 w-4/5 rounded" />
        <div className="shimmer h-3 w-2/3 rounded" />
      </div>

      <div className="mt-5 min-h-10">
        <AnimatePresence mode="wait">
          <motion.p
            key={tipIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={transition}
            className="text-sm leading-relaxed text-secondary"
          >
            {WAITING_TIPS[tipIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </section>
  );
}
