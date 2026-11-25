import { SummarizeError } from "@/lib/errors";
import type { SummarizeEvent, SummarizeFailureCode } from "@/lib/types";
import { extractYoutubeId } from "@/lib/youtube";
import { summarizeTranscript } from "@/server/summarize";
import { loadMetadata, loadTranscript } from "@/server/supadata";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = await readBody(request);
  const url = typeof body?.url === "string" ? body.url : "";
  const videoId = extractYoutubeId(url);

  if (!videoId) {
    return Response.json(errorEvent("invalid-url"), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SummarizeEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        send({ type: "step", step: 0 });
        const canonical = `https://www.youtube.com/watch?v=${videoId}`;
        const [chunks, metadata] = await Promise.all([
          loadTranscript(canonical, request.signal),
          loadMetadata(canonical, request.signal),
        ]);

        send({ type: "step", step: 1 });
        send({ type: "step", step: 2 });
        const summary = await summarizeTranscript({
          videoId,
          canonicalUrl: canonical,
          chunks,
          metadata,
          signal: request.signal,
        });
        send({ type: "result", summary });
      } catch (error) {
        if (request.signal.aborted || isAbortError(error)) return;
        const code = error instanceof SummarizeError ? error.code : "network";
        console.error(
          "summarize",
          code,
          error instanceof Error ? error.name : "unknown",
        );
        send(errorEvent(failureCode(code), error instanceof SummarizeError ? error.message : undefined));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as { url?: unknown } | null;
  } catch {
    return null;
  }
}

function errorEvent(code: SummarizeFailureCode, message?: string): SummarizeEvent {
  return {
    type: "error",
    code,
    message: message || new SummarizeError(code).message,
  };
}

function failureCode(code: string): SummarizeFailureCode {
  if (code === "invalid-url" || code === "no-speech" || code === "network") return code;
  return "network";
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
