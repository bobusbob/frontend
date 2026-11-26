"use client";

import { Video } from "lucide-react";
import { useState } from "react";
import { YoutubeMark } from "@/components/youtube-mark";
import { formatCreatedAt } from "@/lib/format";
import type { Summary } from "@/lib/types";

export function HistoryList({
  items,
  activeId,
  onOpen,
  onClear,
}: {
  items: Summary[];
  activeId: string | null;
  onOpen: (summary: Summary) => void;
  onClear: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto mt-10 w-full max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-ink">Недавние выжимки</h2>
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer text-xs text-faint hover:text-ink"
        >
          Очистить
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition hover:-translate-y-px hover:border-line-strong"
              aria-current={item.id === activeId ? "true" : undefined}
            >
              <HistoryThumb summary={item} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-faint">
                  {item.source === "youtube" ? <YoutubeMark className="size-3" /> : null}
                  {item.source === "youtube" ? "YouTube" : "Файл"}
                  {formatCreatedAt(item.createdAt)
                    ? ` · ${formatCreatedAt(item.createdAt)}`
                    : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HistoryThumb({ summary }: { summary: Summary }) {
  const [failed, setFailed] = useState(false);

  if (!summary.thumbnail || failed) {
    return (
      <span className="grid h-12 w-[85px] shrink-0 place-items-center rounded-md bg-elevated text-faint">
        <Video className="size-4" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={summary.thumbnail}
      alt=""
      width={120}
      height={68}
      className="h-12 w-[85px] shrink-0 rounded-md object-cover"
      onError={() => setFailed(true)}
    />
  );
}
