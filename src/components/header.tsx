"use client";

import { CircleQuestionMark, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header({
  onHome,
  onOpenFaq,
}: {
  onHome: () => void;
  onOpenFaq: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-app/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onHome}
          className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-white shadow-[0_0_24px_var(--accent-glow)]">
            <Sparkles className="size-4" />
          </span>
          <span className="truncate text-[15px] font-semibold tracking-tight text-ink">
            SummaVideo
          </span>
        </button>

        <div className="flex items-center gap-1 sm:gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-secondary">
            <span className="size-1.5 rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
            <span className="hidden sm:inline">Free Beta</span>
            <span className="sm:hidden">Beta</span>
          </span>
          <ThemeToggle />
          <button
            type="button"
            onClick={onOpenFaq}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm text-secondary transition hover:bg-elevated hover:text-ink sm:px-2.5"
          >
            <CircleQuestionMark className="size-4" />
            <span className="hidden sm:inline">Вопросы</span>
          </button>
        </div>
      </div>
    </header>
  );
}
