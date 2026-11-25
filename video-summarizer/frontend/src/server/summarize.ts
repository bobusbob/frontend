import { GoogleGenAI } from "@google/genai";
import { SummarizeError } from "@/lib/errors";
import { buildPrompt, prepareTranscript, retryPrefix } from "@/server/prompt";
import { assembleSummary, attachTimestamps, parseModelDraft } from "@/server/summary-json";
import type { TranscriptChunk, VideoMetadata } from "@/server/supadata";

const MODEL = "gemini-4-hydrogen";
const MODEL_TIMEOUT_MS = 30_000;

export async function summarizeTranscript(input: {
  videoId: string;
  canonicalUrl: string;
  chunks: TranscriptChunk[];
  metadata: VideoMetadata | null;
  signal: AbortSignal;
}) {
  const prepared = prepareTranscript(input.chunks);
  if (!prepared.transcript.trim() || prepared.allowedSeconds.length === 0) {
    throw new SummarizeError("no-speech");
  }

  const title = input.metadata?.title || "Видео YouTube";
  const prompt = buildPrompt({
    title,
    durationSeconds: input.metadata?.durationSeconds ?? null,
    transcript: prepared.transcript,
    compressed: prepared.compressed,
  });

  const draft = await requestDraft(prompt, prepared.allowedSeconds, input.signal);
  const chapters = attachTimestamps(draft.chapters, prepared.allowedSeconds);
  if (chapters.length < 3) throw new SummarizeError("network");

  return assembleSummary({
    tldr: draft.tldr,
    chapters,
    videoId: input.videoId,
    canonicalUrl: input.canonicalUrl,
    title,
    author: input.metadata?.author ?? null,
    thumbnail:
      input.metadata?.thumbnailUrl || `https://i.ytimg.com/vi/${input.videoId}/hqdefault.jpg`,
    durationSeconds: input.metadata?.durationSeconds ?? null,
  });
}

async function requestDraft(prompt: string, allowedSeconds: number[], signal: AbortSignal) {
  const first = await readDraft(prompt, false, allowedSeconds, signal);
  if (first) return first;

  const second = await readDraft(prompt, true, allowedSeconds, signal);
  if (!second) throw new SummarizeError("network");
  return second;
}

async function readDraft(
  prompt: string,
  reminder: boolean,
  allowedSeconds: number[],
  signal: AbortSignal,
) {
  try {
    const raw = await askModel(prompt, reminder, signal);
    const parsed = parseModelDraft(raw);
    if (!parsed || attachTimestamps(parsed.chapters, allowedSeconds).length < 3) return null;
    return parsed;
  } catch (error) {
    if (isAbortError(error)) throw error;
    return null;
  }
}

async function askModel(prompt: string, reminder: boolean, signal: AbortSignal) {
  throwIfAborted(signal);
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new SummarizeError("network");

  const ai = new GoogleGenAI({ apiKey: key });
  const input = reminder ? `${retryPrefix()}\n\n${prompt}` : prompt;

  try {
    const interaction = await withTimeout(
      ai.interactions.create({
        model: MODEL,
        input,
        stream: false,
      }),
      MODEL_TIMEOUT_MS,
      signal,
    );
    const text = interaction.output_text?.trim();
    if (!text) throw new SummarizeError("network");
    return text;
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (error instanceof SummarizeError) throw error;
    throw new SummarizeError("network");
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, signal: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new SummarizeError("network")), ms);
    const onAbort = () => {
      clearTimeout(timeout);
      reject(abortError());
    };

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        clearTimeout(timeout);
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw abortError();
}

function abortError() {
  return new DOMException("The operation was aborted.", "AbortError");
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
