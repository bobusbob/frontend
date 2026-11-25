"use client";

import { MicOff, RotateCcw, WifiOff } from "lucide-react";
import type { AppError } from "@/lib/types";

export function ErrorCard({
  error,
  onRetry,
}: {
  error: AppError;
  onRetry: () => void;
}) {
  const Icon = error.code === "no-speech" ? MicOff : WifiOff;

  return (
    <section className="mx-auto mt-6 w-full max-w-2xl rounded-2xl border border-danger/30 bg-surface p-6 text-center shadow-[var(--shadow)]">
      <span className="mx-auto grid size-10 place-items-center rounded-full bg-danger/10 text-danger">
        <Icon className="size-4" />
      </span>
      <h2 className="mt-4 text-lg font-medium tracking-tight text-ink">{error.title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-secondary">{error.message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-white transition hover:-translate-y-px"
      >
        <RotateCcw className="size-4" />
        Попробовать снова
      </button>
    </section>
  );
}
