"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ClipboardPaste, FileVideoCamera, Upload, Video, X } from "lucide-react";
import { useSyncExternalStore, useEffect, useRef, useState, type ReactNode } from "react";
import { YoutubeMark } from "@/components/youtube-mark";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { useSoftTransition } from "@/lib/use-soft-transition";
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

export function InputHub({
  mode,
  onModeChange,
  url,
  onUrlChange,
  preview,
  previewState,
  file,
  onFileSelect,
  onFileClear,
  urlError,
  fileError,
  busy,
  canSubmit,
  onSubmit,
  onToast,
}: {
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
  const transition = useSoftTransition();
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
        <ModeSwitch mode={mode} onChange={onModeChange} disabled={busy} />

        <div className="mt-3">
          <AnimatePresence mode="wait" initial={false}>
            {mode === "youtube" ? (
              <motion.div
                key="youtube"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={transition}
              >
                <YoutubeField
                  url={url}
                  onUrlChange={onUrlChange}
                  preview={preview}
                  previewState={previewState}
                  error={urlError}
                  disabled={busy}
                  onToast={onToast}
                />
              </motion.div>
            ) : (
              <motion.div
                key="file"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={transition}
              >
                <FileField
                  file={file}
                  error={fileError}
                  disabled={busy}
                  onFileSelect={onFileSelect}
                  onFileClear={onFileClear}
                />
              </motion.div>
            )}
          </AnimatePresence>
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
        Без регистрации. Пока это интерфейс: видео остаётся на устройстве.
      </p>
    </section>
  );
}

function ModeSwitch({
  mode,
  onChange,
  disabled,
}: {
  mode: SourceMode;
  onChange: (mode: SourceMode) => void;
  disabled: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="relative grid grid-cols-2 rounded-full bg-track p-1">
      <motion.span
        aria-hidden
        className="absolute top-1 bottom-1 rounded-full border border-line bg-pill shadow-sm"
        initial={false}
        animate={{
          left: mode === "youtube" ? 4 : "50%",
          width: "calc(50% - 4px)",
        }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
      />
      <ModeButton
        active={mode === "youtube"}
        disabled={disabled}
        onClick={() => onChange("youtube")}
      >
        <YoutubeMark className="size-4 shrink-0" />
        <span className="truncate sm:hidden">YouTube</span>
        <span className="hidden truncate sm:inline">YouTube ссылка</span>
      </ModeButton>
      <ModeButton active={mode === "file"} disabled={disabled} onClick={() => onChange("file")}>
        <Upload className="size-4 shrink-0" />
        <span className="truncate sm:hidden">Файл</span>
        <span className="hidden truncate sm:inline">Видео с компьютера</span>
      </ModeButton>
    </div>
  );
}

function ModeButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative z-10 flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full px-2 text-sm transition disabled:cursor-not-allowed",
        active ? "text-ink" : "text-faint hover:text-secondary",
      )}
    >
      {children}
    </button>
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

function FileField({
  file,
  error,
  disabled,
  onFileSelect,
  onFileClear,
}: {
  file: File | null;
  error: string | null;
  disabled: boolean;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [dragOver, setDragOver] = useState(false);

  function openPicker() {
    if (disabled || !inputRef.current) return;
    inputRef.current.value = "";
    inputRef.current.click();
  }

  function takeFile(next: File | undefined) {
    if (!next || disabled) return;
    onFileSelect(next);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".mp4,.mov,.webm,.mkv,video/mp4,video/quicktime,video/webm,video/x-matroska"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => takeFile(event.target.files?.[0])}
      />

      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-app px-3 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-success/15 text-success">
            <FileVideoCamera className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{file.name}</p>
            <p className="text-xs text-secondary">{formatBytes(file.size)} · файл выбран</p>
          </div>
          <button
            type="button"
            onClick={onFileClear}
            disabled={disabled}
            aria-label="Убрать файл"
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint hover:bg-elevated hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          aria-label="Выбрать видеофайл"
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openPicker();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            depth.current += 1;
            setDragOver(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault();
            depth.current -= 1;
            if (depth.current <= 0) {
              depth.current = 0;
              setDragOver(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            depth.current = 0;
            setDragOver(false);
            takeFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center transition duration-200 sm:h-44",
            dragOver
              ? "border-accent bg-accent/10"
              : "border-line bg-app hover:border-line-strong",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          <span
            className={cn(
              "grid size-10 place-items-center rounded-full border border-line",
              dragOver ? "text-accent" : "text-secondary",
            )}
          >
            {dragOver ? <Upload className="size-4" /> : <Video className="size-4" />}
          </span>
          <p className="mt-3 text-sm text-secondary">
            {dragOver ? (
              "Отпустите файл для загрузки"
            ) : (
              <>
                Перетащите видео сюда или{" "}
                <span className="font-medium text-ink underline decoration-line underline-offset-4">
                  выберите файл
                </span>
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-faint">MP4, MOV, WebM, MKV · до 500 МБ</p>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-2 px-1 text-sm text-danger">
          {error}
        </p>
      ) : null}
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
