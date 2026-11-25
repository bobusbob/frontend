"use client";

import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { Check, Copy, Download, RotateCcw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { formatDuration, formatTimestamp, slugify } from "@/lib/format";
import { transcriptToPlainText, type TranscriptResult } from "@/lib/transcribe";

const LANGUAGE_NAMES: Record<string, string> = {
  ru: "русский",
  en: "английский",
  uk: "украинский",
  de: "немецкий",
  fr: "французский",
  es: "испанский",
};

export function TranscriptProgress({
  status,
  lines,
  onCancel,
}: {
  status: string;
  lines: TranscriptResult["lines"];
  onCancel: () => void;
}) {
  return (
    <section className="mx-auto mt-6 w-full max-w-4xl rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-ink">Расшифровываем речь</h2>
          <p className="mt-1 text-sm leading-relaxed text-secondary">
            {status || "Файл остаётся на этом компьютере."}
          </p>
        </div>
        <button type="button" onClick={onCancel} className="cursor-pointer text-sm text-secondary hover:text-ink">
          Отмена
        </button>
      </div>
      <div className="mt-5 h-1 overflow-hidden rounded-full bg-elevated">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
      </div>
      {lines.length > 0 ? (
        <div className="mt-5 max-h-64 space-y-3 overflow-auto pr-1">
          {lines.slice(-8).map((line, index) => (
            <p key={`${line.start}-${index}`} className="text-[15px] leading-relaxed text-secondary">
              <span className="mr-2 font-mono text-xs text-faint">{formatTimestamp(line.start)}</span>
              {line.text}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function TranscriptView({
  result,
  onReset,
  onToast,
}: {
  result: TranscriptResult;
  onReset: () => void;
  onToast: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const language = result.language ? LANGUAGE_NAMES[result.language] ?? result.language : null;

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(transcriptToPlainText(result));
      setCopied(true);
      onToast("Расшифровка скопирована в буфер обмена");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast("Не удалось скопировать. Разрешите доступ к буферу обмена.");
    }
  }

  async function downloadWord() {
    const document = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: result.fileName.replace(/\.[^.]+$/, ""),
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: [
                    language ? `Язык: ${language}` : null,
                    typeof result.duration === "number"
                      ? `Длительность: ${formatDuration(result.duration)}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  italics: true,
                }),
              ],
            }),
            ...result.lines.map(
              (line) =>
                new Paragraph({
                  children: [
                    new TextRun({ text: `${formatTimestamp(line.start)}  `, bold: true }),
                    new TextRun(line.text),
                  ],
                }),
            ),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(document);
    const href = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = href;
    link.download = `${slugify(result.fileName)}.docx`;
    window.document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
    onToast("Файл Word сохранён");
  }

  return (
    <article className="mx-auto mt-6 w-full max-w-4xl rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-8">
      <h2 className="text-xl leading-snug font-medium tracking-tight text-balance text-ink sm:text-2xl">
        {result.fileName}
      </h2>
      <p className="mt-2 text-sm text-secondary">
        Полная расшифровка
        {language ? ` · ${language}` : ""}
        {typeof result.duration === "number" ? ` · ${formatDuration(result.duration)}` : ""}
      </p>

      <div className="mt-5 hidden flex-wrap gap-2 md:flex">
        <ActionButton onClick={() => void copyAll()} active={copied}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Скопировано" : "Копировать текст"}
        </ActionButton>
        <ActionButton onClick={() => void downloadWord()}>
          <Download className="size-3.5" />
          Скачать Word
        </ActionButton>
        <ActionButton onClick={onReset}>
          <RotateCcw className="size-3.5" />
          Новое видео
        </ActionButton>
      </div>

      <div className="mt-6 max-h-[70vh] space-y-4 overflow-auto pr-1">
        {result.lines.map((line, index) => (
          <p key={`${line.start}-${index}`} className="text-[15px] leading-[1.65] text-secondary">
            <span className="mr-2 font-mono text-xs text-faint">{formatTimestamp(line.start)}</span>
            {line.text}
          </p>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 backdrop-blur-md md:hidden">
        <div className="grid grid-cols-3 gap-1 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <MobileButton onClick={() => void copyAll()} label={copied ? "Готово" : "Копия"} icon={copied ? Check : Copy} />
          <MobileButton onClick={() => void downloadWord()} label="Word" icon={Download} />
          <MobileButton onClick={onReset} label="Новое" icon={RotateCcw} />
        </div>
      </div>
    </article>
  );
}

function ActionButton({
  children,
  onClick,
  active = false,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-sm transition duration-200 hover:-translate-y-px ${
        active
          ? "border-success/40 bg-success/10 text-success"
          : "border-line bg-app text-secondary hover:border-line-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function MobileButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof Copy;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] text-secondary"
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
