import { SummarizeError } from "../lib/errors";

const API_ROOT = "https://api.supadata.ai/v1";
const TRANSCRIPT_DEADLINE_MS = 70_000;

export interface TranscriptChunk {
  text: string;
  offset: number;
  duration: number;
}

export interface VideoMetadata {
  title: string | null;
  author: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

export async function loadTranscript(url: string, signal: AbortSignal) {
  const endpoint = new URL(`${API_ROOT}/transcript`);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("lang", "ru");
  endpoint.searchParams.set("text", "false");
  endpoint.searchParams.set("mode", "auto");

  const response = await fetch(endpoint, {
    headers: { "x-api-key": supadataKey() },
    signal,
  });

  if (response.status === 202) {
    const jobId = readJobId(await response.json());
    return waitForTranscript(jobId, signal);
  }

  if (!response.ok) {
    throw await toSupadataError(response);
  }

  return readChunks(await response.json());
}

export async function loadMetadata(url: string, signal: AbortSignal): Promise<VideoMetadata | null> {
  try {
    const endpoint = new URL(`${API_ROOT}/metadata`);
    endpoint.searchParams.set("url", url);

    const response = await fetch(endpoint, {
      headers: { "x-api-key": supadataKey() },
      signal,
    });

    if (!response.ok) return null;
    return readMetadata(await response.json());
  } catch (error) {
    if (isAbortError(error)) throw error;
    return null;
  }
}

function supadataKey() {
  const key = process.env.SUPADATA_API_KEY;
  if (!key) throw new SummarizeError("network");
  return key;
}

async function waitForTranscript(jobId: string, signal: AbortSignal) {
  const deadline = Date.now() + TRANSCRIPT_DEADLINE_MS;
  let pause = 1500;

  while (Date.now() < deadline) {
    throwIfAborted(signal);

    const response = await fetch(`${API_ROOT}/transcript/${jobId}`, {
      headers: { "x-api-key": supadataKey() },
      signal,
    });

    if (!response.ok) throw await toSupadataError(response);

    const job = (await response.json()) as { status?: string; content?: unknown; error?: unknown };

    if (job.status === "completed") return readChunks(job);
    if (job.status === "failed") throw mapFailedJob(job.error);

    await delay(pause, signal);
    pause = Math.min(pause + 500, 4000);
  }

  throw new SummarizeError("network");
}

function readJobId(data: unknown) {
  if (!data || typeof data !== "object" || !("jobId" in data)) {
    throw new SummarizeError("network");
  }
  const jobId = (data as { jobId?: unknown }).jobId;
  if (typeof jobId !== "string" || !jobId) throw new SummarizeError("network");
  return jobId;
}

function readChunks(data: unknown) {
  const content =
    data && typeof data === "object" && "content" in data
      ? (data as { content?: unknown }).content
      : undefined;

  if (!Array.isArray(content)) throw new SummarizeError("no-speech");

  const chunks = content.filter(isChunk);
  if (chunks.length === 0) throw new SummarizeError("no-speech");
  return chunks;
}

function isChunk(value: unknown): value is TranscriptChunk {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<TranscriptChunk>;
  return (
    typeof item.text === "string" &&
    typeof item.offset === "number" &&
    typeof item.duration === "number"
  );
}

function readMetadata(data: unknown): VideoMetadata | null {
  if (!data || typeof data !== "object") return null;
  const record = data as {
    title?: unknown;
    author?: { displayName?: unknown };
    media?: { thumbnailUrl?: unknown; duration?: unknown };
  };

  return {
    title: typeof record.title === "string" ? record.title : null,
    author: typeof record.author?.displayName === "string" ? record.author.displayName : null,
    thumbnailUrl: typeof record.media?.thumbnailUrl === "string" ? record.media.thumbnailUrl : null,
    durationSeconds: typeof record.media?.duration === "number" ? record.media.duration : null,
  };
}

async function toSupadataError(response: Response) {
  const body = await response.json().catch(() => null);
  const errorCode =
    body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : undefined;
  console.error("supadata", response.status, errorCode ?? "no-code");
  if (response.status === 429 || errorCode === "limit-exceeded") {
    return new SummarizeError(
      "network",
      "Лимит запросов к расшифровке исчерпан. Попробуйте позже.",
    );
  }
  if (response.status === 402 || errorCode === "upgrade-required") {
    return new SummarizeError(
      "network",
      "На ключе Supadata закончился тариф. Нужно продлить план или подождать.",
    );
  }
  if (response.status === 401 || response.status === 403 || errorCode === "unauthorized" || errorCode === "forbidden") {
    return new SummarizeError(
      "network",
      "Сервис расшифровки не принял ключ. Проверьте SUPADATA_API_KEY.",
    );
  }
  return new SummarizeError(statusToCode(response.status, errorCode));
}

function mapFailedJob(error: unknown) {
  const errorCode =
    error && typeof error === "object" && "error" in error && typeof error.error === "string"
      ? error.error
      : undefined;
  if (errorCode === "transcript-unavailable") return new SummarizeError("no-speech");
  if (errorCode === "invalid-request" || errorCode === "not-found") {
    return new SummarizeError("invalid-url");
  }
  return new SummarizeError("network");
}

function statusToCode(status: number, errorCode?: string): SummarizeError["code"] {
  if (status === 206 || errorCode === "transcript-unavailable") return "no-speech";
  if (
    status === 400 ||
    status === 404 ||
    errorCode === "invalid-request" ||
    errorCode === "not-found"
  ) {
    return "invalid-url";
  }
  return "network";
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    throwIfAborted(signal);
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
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
