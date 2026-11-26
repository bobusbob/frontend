"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ErrorCard } from "@/components/error-card";
import { FaqDialog } from "@/components/faq-dialog";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { HistoryList } from "@/components/history-list";
import { HowItWorks } from "@/components/how-it-works";
import { InputHub } from "@/components/input-hub";
import { ProcessingCard } from "@/components/processing-card";
import { SummaryView } from "@/components/summary-view";
import { TranscriptProgress, TranscriptView } from "@/components/transcript-view";
import { Toast } from "@/components/toast";
import { cn } from "@/lib/cn";
import { errorOf, SummarizeError } from "@/lib/errors";
import { validateVideoFile } from "@/lib/files";
import { clearHistory, rememberSummary } from "@/lib/storage";
import { createSummary } from "@/lib/summarize";
import { transcribeLocalFile, type TranscriptLine, type TranscriptResult } from "@/lib/transcribe";
import type { AppError, AppPhase, SourceMode, Summary, YoutubePreview } from "@/lib/types";
import { useHistory } from "@/lib/use-history";
import { useSoftTransition } from "@/lib/use-soft-transition";
import { extractYoutubeId, fetchYoutubePreview } from "@/lib/youtube";

export function HomeScreen() {
  const transition = useSoftTransition();
  const [mode, setMode] = useState<SourceMode>("youtube");
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<YoutubePreview | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [phase, setPhase] = useState<AppPhase>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [transcriptStatus, setTranscriptStatus] = useState("");
  const [blockingError, setBlockingError] = useState<AppError | null>(null);
  const history = useHistory();
  const [toast, setToast] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const runId = useRef(0);
  const submitRef = useRef<() => void>(() => {});

  const canSubmit =
    phase !== "processing" && (mode === "youtube" ? url.trim().length > 0 : file !== null);

  useEffect(() => {
    return () => {
      runId.current += 1;
    };
  }, []);

  useEffect(() => {
    const id = extractYoutubeId(url);
    if (!id) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetchYoutubePreview(url).then((next) => {
        if (cancelled) return;
        setPreview((current) => (current?.id === next?.id ? current : next));
      });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [url]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (phase === "idle") return;
    if (window.innerWidth >= 768 && phase === "processing") return;
    stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase, summary?.id, transcript?.fileName]);

  useEffect(() => {
    submitRef.current = () => {
      void submit();
    };
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      submitRef.current();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function showToast(message: string) {
    setToast(message);
  }

  function changeUrl(value: string) {
    setUrl(value);
    setUrlError(null);
  }

  function selectFile(next: File) {
    const problem = validateVideoFile(next);
    if (problem) {
      setFile(null);
      setFileError(problem.message);
      return;
    }
    setFile(next);
    setFileError(null);
  }

  async function submit() {
    if (phase === "processing" || faqOpen) return;

    setUrlError(null);
    setBlockingError(null);

    if (mode === "youtube") {
      if (!url.trim()) return;
      if (!extractYoutubeId(url)) {
        setUrlError(errorOf("invalid-url").message);
        setPhase("idle");
        return;
      }
      await submitYoutube();
      return;
    }

    if (!file) return;
    await submitFile(file);
  }

  async function submitYoutube() {
    const token = runId.current + 1;
    runId.current = token;
    setTranscript(null);
    setTranscriptLines([]);
    setPhase("processing");
    setStepIndex(0);

    try {
      const next = await createSummary(
        {
          mode: "youtube",
          youtubeUrl: url.trim(),
          youtube: preview,
          file: null,
        },
        (index) => {
          if (runId.current === token) setStepIndex(index);
        },
        () => runId.current !== token,
      );

      if (!next || runId.current !== token) return;
      setSummary(next);
      rememberSummary(next);
      setPhase("result");
    } catch (error) {
      if (runId.current !== token) return;
      if (error instanceof SummarizeError && error.code === "invalid-url") {
        setUrlError(error.message);
        setPhase("idle");
        return;
      }
      if (error instanceof SummarizeError) {
        const known = errorOf(error.code);
        setBlockingError({
          code: error.code,
          title: known.title,
          message: error.message || known.message,
        });
      } else {
        setBlockingError(errorOf("network"));
      }
      setPhase("error");
    }
  }

  async function submitFile(selected: File) {
    const token = runId.current + 1;
    runId.current = token;
    setSummary(null);
    setTranscript(null);
    setTranscriptLines([]);
    setTranscriptStatus("Отправляем файл в локальную расшифровку...");
    setPhase("processing");

    try {
      const result = await transcribeLocalFile(selected, {
        onStatus: (message) => {
          if (runId.current === token) setTranscriptStatus(message);
        },
        onLine: (line) => {
          if (runId.current === token) setTranscriptLines((current) => [...current, line]);
        },
        isCancelled: () => runId.current !== token,
      });

      if (!result || runId.current !== token) return;
      setTranscript(result);
      setPhase("result");
    } catch (error) {
      if (runId.current !== token) return;
      const message = error instanceof Error ? error.message : errorOf("network").message;
      const noSpeech = message.includes("не удалось распознать речь");
      setBlockingError({
        code: noSpeech ? "no-speech" : "network",
        title: noSpeech ? "Речь не найдена" : "Расшифровка не запустилась",
        message,
      });
      setPhase("error");
    }
  }

  function cancel() {
    runId.current += 1;
    setPhase(summary || transcript ? "result" : "idle");
    setStepIndex(0);
  }

  function reset() {
    runId.current += 1;
    setPhase("idle");
    setSummary(null);
    setTranscript(null);
    setTranscriptLines([]);
    setTranscriptStatus("");
    setBlockingError(null);
    setUrl("");
    setPreview(null);
    setFile(null);
    setUrlError(null);
    setFileError(null);
    setMode("youtube");
    setStepIndex(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openHistory(item: Summary) {
    runId.current += 1;
    setTranscript(null);
    setSummary(item);
    setBlockingError(null);
    setPhase("result");
  }

  function wipeHistory() {
    clearHistory();
  }

  const requestedId = mode === "youtube" ? extractYoutubeId(url) : null;
  const visiblePreview = preview?.id === requestedId ? preview : null;
  const previewState = !requestedId ? "idle" : visiblePreview ? "ready" : "loading";

  return (
    <div className="relative flex min-h-full flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(ellipse_at_top,var(--accent-glow),transparent_62%)]" />
      <a
        href="#hub"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
      >
        К полю ввода
      </a>
      <Header onHome={reset} onOpenFaq={() => setFaqOpen(true)} />
      <main
        className={cn(
          "mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6",
          phase === "result" ? "pb-28 md:pb-16" : "pb-16",
        )}
      >
        <Hero />
        <InputHub
          mode={mode}
          onModeChange={setMode}
          url={url}
          onUrlChange={changeUrl}
          preview={visiblePreview}
          previewState={previewState}
          file={file}
          onFileSelect={selectFile}
          onFileClear={() => {
            setFile(null);
            setFileError(null);
          }}
          urlError={urlError}
          fileError={fileError}
          busy={phase === "processing"}
          canSubmit={canSubmit}
          onSubmit={() => void submit()}
          onToast={showToast}
        />

        <div ref={stageRef} className="scroll-mt-24">
          <AnimatePresence mode="wait">
            {phase === "processing" && mode === "file" ? (
              <motion.div
                key="transcript-progress"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={transition}
              >
                <TranscriptProgress
                  status={transcriptStatus}
                  lines={transcriptLines}
                  onCancel={cancel}
                />
              </motion.div>
            ) : null}
            {phase === "processing" && mode === "youtube" ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={transition}
              >
                <ProcessingCard mode={mode} stepIndex={stepIndex} onCancel={cancel} />
              </motion.div>
            ) : null}
            {phase === "error" && blockingError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={transition}
              >
                <ErrorCard error={blockingError} onRetry={() => void submit()} />
              </motion.div>
            ) : null}
            {phase === "result" && transcript ? (
              <motion.div
                key={transcript.fileName}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={transition}
              >
                <TranscriptView result={transcript} onReset={reset} onToast={showToast} />
              </motion.div>
            ) : null}
            {phase === "result" && summary && !transcript ? (
              <motion.div
                key={summary.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={transition}
              >
                <SummaryView summary={summary} onReset={reset} onToast={showToast} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <HistoryList
          items={history}
          activeId={phase === "result" ? summary?.id ?? null : null}
          onOpen={openHistory}
          onClear={wipeHistory}
        />
        <HowItWorks />
      </main>
      <Footer onOpenFaq={() => setFaqOpen(true)} />
      <Toast message={toast} />
      <FaqDialog open={faqOpen} onClose={() => setFaqOpen(false)} />
    </div>
  );
}
