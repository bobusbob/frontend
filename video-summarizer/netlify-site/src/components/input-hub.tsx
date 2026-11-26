"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ClipboardPaste, Video, X } from "lucide-react";
import { useSyncExternalStore, useEffect, useState } from "react";
import { YoutubeMark } from "@/components/youtube-mark";
import { cn } from "@/lib/cn";
import type { SourceMode, YoutubePreview } from "@/lib/types";
import { extractYoutubeId } from "@/lib/youtube";

function subscribeToNothing() {
  return () => {};
}

function readShortcut() {
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘ Enter" : "Ctrl + Enter";
}

function readServerShortcut() {
  return "Ctrl + Enter";
}

export function InputHub(props: {
  mode: SourceMode;
  onModeChange: (mode: SourceMode) => void;
  url: string;
  onUrlChange: (value: string) => void;
  preview: YoutubePreview | null;
  previewState: "idle" | "loading" | "ready";
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  urlError: string | null;
  fileError: string | null;
  busy: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  onToast: (message: string) => void;
}) {
  const { url, onUrlChange, preview, previewState, urlError, busy, canSubmit, onSubmit, onToast } =
    props;
  const shortcut = useSyncExternalStore(subscribeToNothing, readShortcut, readServerShortcut);

  return (
    <section id="hub" className="mx-auto mt-8 w-full max-w-2xl sm:mt-10">
      <form
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="relative rounded-2xl border border-line bg-surface p-3 shadow-[var(--shadow)] sm:p-4"
      >
        <div className="pointer-events-none absolute -inset-px -z-10 rounded-2xl shadow-[0_0_80px_-12px_var(--accent-glow)]" />
        <div className="flex items-center gap-2 px-1 text-sm font-medium text-ink">
          <YoutubeMark className="size-4 shrink-0" />
          Ссылка YouTube
        </div>

        <div className="mt-3">
          <YoutubeField
            url={url}
            onUrlChange={onUrlChange}
            preview={preview}
            previewState={previewState}
            error={urlError}
            disabled={busy}
            onToast={onToast}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit || busy}
          className="mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-medium text-white transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] enabled:hover:-translate-y-px enabled:hover:shadow-[0_10px_30px_-8px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Создать краткое содержание
          <ArrowRight className="size-4" />
        </button>
      </form>

      <p className="mt-3 text-center text-xs leading-relaxed text-faint">
        <span className="hidden md:inline">
          Enter или {shortcut}.{" "}
        </span>
        Без регистрации. Ссылка уходит на сервер для расшифровки и не сохраняется.
      </p>
    </section>
  );
}

function YoutubeField({
  url,
  onUrlChange,
  preview,
  previewState,
  error,
  disabled,
  onToast,
}: {
  url: string;
  onUrlChange: (value: string) => void;
  preview: YoutubePreview | null;
  previewState: "idle" | "loading" | "ready";
  error: string | null;
  disabled: boolean;
  onToast: (message: string) => void;
}) {
  const [clipboardHot, setClipboardHot] = useState(false);
  const errorId = "youtube-url-error";

  useEffect(() => {
    let ignore = false;

    async function checkClipboard() {
      try {
        const permission = await navigator.permissions.query({
          name: "clipboard-read" as PermissionName,
        });
        if (permission.state !== "granted") return;
        const text = await navigator.clipboard.readText();
        if (!ignore) setClipboardHot(Boolean(extractYoutubeId(text)));
      } catch {
        if (!ignore) setClipboardHot(false);
      }
    }

    void checkClipboard();
    window.addEventListener("focus", checkClipboard);
    return () => {
      ignore = true;
      window.removeEventListener("focus", checkClipboard);
    };
  }, []);

  async function paste() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        onToast("Буфер обмена пуст");
        return;
      }
      onUrlChange(text);
      setClipboardHot(Boolean(extractYoutubeId(text)));
    } catch {
      onToast("Не удалось прочитать буфер. Разрешите доступ или вставьте вручную.");
    }
  }

  return (
    <div>
      <div
        className={cn(
          "flex h-14 items-center rounded-xl border bg-app transition",
          error
            ? "border-danger shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger)_18%,transparent)]"
            : "border-line focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-glow)]",
        )}
      >
        <YoutubeMark className="ml-3.5 size-4 shrink-0 text-faint" />
        <input
          value={url}
          disabled={disabled}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=... или youtu.be/..."
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] text-ink outline-none placeholder:text-faint focus-visible:outline-none disabled:opacity-60"
        />
        <div className="mr-1.5 flex shrink-0 items-center gap-1">
          {url ? (
            <button
              type="button"
              onClick={() => onUrlChange("")}
              disabled={disabled}
              aria-label="Очистить ссылку"
              className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint hover:bg-elevated hover:text-ink"
            >
              <X className="size-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void paste()}
            disabled={disabled}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition disabled:cursor-not-allowed",
              clipboardHot
                ? "bg-accent/15 text-accent shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_35%,transparent)]"
                : "text-secondary hover:bg-elevated hover:text-ink",
            )}
          >
            <ClipboardPaste className="size-3.5" />
            <span className="max-[380px]:sr-only">Вставить</span>
          </button>
        </div>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="mt-2 px-1 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <AnimatePresence initial={false}>
        {previewState === "loading" ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 pt-3">
              <div className="shimmer h-12 w-[85px] rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="shimmer h-3 w-2/3 rounded" />
                <div className="shimmer h-3 w-1/3 rounded" />
              </div>
            </div>
          </motion.div>
        ) : null}
        {previewState === "ready" && preview ? (
          <motion.div
            key={preview.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 pt-3">
              <Thumbnail src={preview.thumbnail} alt="" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{preview.title}</p>
                <p className="truncate text-xs text-secondary">{preview.author}</p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Thumbnail({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="grid h-12 w-[85px] shrink-0 place-items-center rounded-md bg-elevated text-faint">
        <Video className="size-4" />
      </span>
    );
  }

  return (
    // Превью YouTube грузим напрямую: серверный оптимизатор часто не достаёт i.ytimg.com.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={120}
      height={68}
      className="h-12 w-[85px] shrink-0 rounded-md object-cover"
      onError={() => setFailed(true)}
    />
  );
}
