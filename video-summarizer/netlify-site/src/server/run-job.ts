import { SummarizeError } from "../lib/errors";
import type { SummarizeFailureCode } from "../lib/types";
import { extractYoutubeId } from "../lib/youtube";
import { writeJob } from "./jobs";
import { summarizeTranscript } from "./summarize";
import { loadMetadata, loadTranscript } from "./supadata";

const JOB_BUDGET_MS = 120_000;

export async function runJob(jobId: string, url: string) {
  if (!process.env.SUPADATA_API_KEY || !process.env.GEMINI_API_KEY) {
    await writeJob(jobId, {
      status: "error",
      step: 0,
      code: "network",
      message: "На сайте не заданы ключи SUPADATA_API_KEY и GEMINI_API_KEY.",
    });
    return;
  }

  const videoId = extractYoutubeId(url);
  if (!videoId) {
    await writeJob(jobId, {
      status: "error",
      step: 0,
      code: "invalid-url",
      message: new SummarizeError("invalid-url").message,
    });
    return;
  }

  const canonical = `https://www.youtube.com/watch?v=${videoId}`;
  const signal = AbortSignal.timeout(JOB_BUDGET_MS);

  try {
    await writeJob(jobId, { status: "running", step: 0 });
    const [chunks, metadata] = await Promise.all([
      loadTranscript(canonical, signal),
      loadMetadata(canonical, signal),
    ]);

    await writeJob(jobId, { status: "running", step: 1 });
    await writeJob(jobId, { status: "running", step: 2 });
    const summary = await summarizeTranscript({
      videoId,
      canonicalUrl: canonical,
      chunks,
      metadata,
      signal,
    });
    await writeJob(jobId, { status: "done", step: 2, summary });
  } catch (error) {
    if (isAbortError(error)) {
      await writeJob(jobId, {
        status: "error",
        step: 2,
        code: "network",
        message: "Выжимка не успела собраться. Попробуйте ещё раз.",
      });
      return;
    }

    const code = error instanceof SummarizeError ? failureCode(error.code) : "network";
    console.error("summarize", code, error instanceof Error ? error.name : "unknown");
    await writeJob(jobId, {
      status: "error",
      step: 2,
      code,
      message: error instanceof SummarizeError ? error.message : new SummarizeError(code).message,
    });
  }
}

function failureCode(code: string): SummarizeFailureCode {
  if (code === "invalid-url" || code === "no-speech" || code === "network") return code;
  return "network";
}

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "TimeoutError")
  );
}
