"use client";

import {
  Check,
  ClockFading,
  Copy,
  Download,
  FileVideoCamera,
  Play,
  RotateCcw,
  Share2,
  Video,
} from "lucide-react";
import { useState } from "react";
import { RichText } from "@/components/rich-text";
import { YoutubeMark } from "@/components/youtube-mark";
import { cn } from "@/lib/cn";
import { pluralMinutes, slugify } from "@/lib/format";
import { summaryToMarkdown } from "@/lib/summarize";
import type { Summary } from "@/lib/types";
import { youtubeTimestampUrl } from "@/lib/youtube";

export function SummaryView({
  summary,
  onReset,
  onToast,
}: {
  summary: Summary;
  onReset: () => void;
  onToast: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(summaryToMarkdown(summary));
      setCopied(true);
      onToast("Выжимка скопирована в буфер обмена");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast("Не удалось скопировать. Разрешите доступ к буферу обмена.");
    }
  }

  function download() {
    const blob = new Blob([summaryToMarkdown(summary)], {
      type: "text/markdown;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${slugify(summary.title)}.md`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
    onToast("Файл Markdown сохранён");
  }

  async function share() {
    const text = summaryToMarkdown(summary);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: summary.title, text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      onToast("Текст выжимки скопирован — им можно поделиться");
    } catch {
      onToast("Не удалось поделиться с этого устройства");
    }
  }

  const actions = [
    { id: "copy", label: "Копировать всё", short: "Копия", icon: copied ? Check : Copy, onClick: () => void copyAll(), active: copied },
    { id: "download", label: "Скачать Markdown", short: "Скачать", icon: Download, onClick: download, active: false },
    { id: "share", label: "Поделиться", short: "Поделиться", icon: Share2, onClick: () => void share(), active: false },
    { id: "reset", label: "Новое видео", short: "Новое", icon: RotateCcw, onClick: onReset, active: false },
  ] as const;

  return (
    <article className="mx-auto mt-6 w-full max-w-4xl rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Cover summary={summary} />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl leading-snug font-medium tracking-tight text-balance text-ink sm:text-2xl">
            {summary.youtubeUrl ? (
              <a
                href={summary.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent"
              >
                {summary.title}
              </a>
            ) : (
              summary.title
            )}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-secondary">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-elevated px-2.5 py-1">
              {summary.source === "youtube" ? (
                <YoutubeMark className="size-3.5" />
              ) : (
                <FileVideoCamera className="size-3.5" />
              )}
              {summary.source === "youtube" ? "YouTube" : "Файл"}
            </span>
            {summary.author ? <span>{summary.author}</span> : null}
            {summary.fileName ? (
              <span className="max-w-full truncate">
                {summary.fileName}
                {summary.fileSizeLabel ? ` · ${summary.fileSizeLabel}` : ""}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <ClockFading className="size-3.5" />~ {pluralMinutes(summary.readMinutes)} чтения
            </span>
          </div>
        </div>
      </div>

      {summary.demo ? (
        <p className="mt-5 rounded-xl border border-line bg-app px-4 py-3 text-sm leading-relaxed text-secondary">
          Пример структуры. Анализ видео подключим отдельно — ссылка и файл никуда не отправляются.
        </p>
      ) : null}

      <div className="mt-5 hidden flex-wrap gap-2 md:flex">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-sm transition duration-200 hover:-translate-y-px",
              action.active
                ? "border-success/40 bg-success/10 text-success"
                : "border-line bg-app text-secondary hover:border-line-strong hover:text-ink",
            )}
          >
            <action.icon className="size-3.5" />
            {action.id === "copy" && copied ? "Скопировано" : action.label}
          </button>
        ))}
      </div>

      <section className="relative mt-6 overflow-hidden rounded-xl border border-line bg-accent/10 px-4 py-4 sm:px-5">
        <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" />
        <h3 className="text-sm font-medium tracking-tight text-ink">Главное за 30 секунд</h3>
        <ul className="mt-3 space-y-2.5">
          {summary.tldr.map((item) => (
            <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-secondary">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-medium tracking-tight text-ink">Структура по главам и таймкодам</h3>
        <div className="mt-2 divide-y divide-line">
          {summary.chapters.map((chapter) => (
            <div key={`${chapter.time}-${chapter.title}`} className="grid gap-3 py-5 sm:grid-cols-[auto_1fr] sm:gap-4">
              {summary.youtubeId ? (
                <a
                  href={youtubeTimestampUrl(summary.youtubeId, chapter.seconds)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-7 w-fit items-center gap-1 rounded-full bg-elevated px-2.5 font-mono text-xs font-medium text-secondary transition hover:bg-accent/15 hover:text-accent"
                >
                  <Play className="size-3" />
                  {chapter.time}
                </a>
              ) : (
                <span className="inline-flex h-7 w-fit items-center rounded-full bg-elevated px-2.5 font-mono text-xs font-medium text-secondary">
                  {chapter.time}
                </span>
              )}
              <div className="min-w-0">
                <h4 className="text-base font-medium tracking-tight text-ink">{chapter.title}</h4>
                <p className="mt-1.5 text-[15px] leading-[1.65] text-secondary">
                  <RichText text={chapter.body} />
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 backdrop-blur-md md:hidden">
        <div className="grid grid-cols-4 gap-1 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px]",
                action.active ? "text-success" : "text-secondary",
              )}
            >
              <action.icon className="size-4" />
              {action.short}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

function Cover({ summary }: { summary: Summary }) {
  const [failed, setFailed] = useState(false);

  if (!summary.thumbnail || failed) {
    return (
      <span className="grid h-16 w-28 shrink-0 place-items-center rounded-lg bg-elevated text-faint">
        <Video className="size-5" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={summary.thumbnail}
      alt=""
      width={160}
      height={90}
      className="h-16 w-28 shrink-0 rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  );
}
