import { formatTimestamp } from "@/lib/format";

export const TRANSCRIBE_URL = "http://127.0.0.1:8765/transcribe";

export interface TranscriptLine {
  start: number;
  text: string;
}

export interface TranscriptResult {
  fileName: string;
  language: string | null;
  duration: number | null;
  lines: TranscriptLine[];
}

interface TranscribeHandlers {
  onStatus: (message: string) => void;
  onLine: (line: TranscriptLine) => void;
  isCancelled: () => boolean;
}

export async function transcribeLocalFile(
  file: File,
  handlers: TranscribeHandlers,
): Promise<TranscriptResult | null> {
  const controller = new AbortController();
  const watch = setInterval(() => {
    if (handlers.isCancelled()) controller.abort();
  }, 50);

  try {
    const response = await fetch(TRANSCRIBE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Filename": encodeURIComponent(file.name),
      },
      body: file,
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const message =
        payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
          ? payload.message
          : "Не удалось расшифровать файл.";
      throw new Error(message);
    }

    if (!response.body) throw new Error("Не удалось расшифровать файл.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const lines: TranscriptLine[] = [];
    let language: string | null = null;
    let duration: number | null = null;
    let done = false;

    while (!handlers.isCancelled()) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const event = parseEvent(part);
        if (!event) continue;
        if (event.type === "status" && typeof event.message === "string") {
          handlers.onStatus(event.message);
        }
        if (event.type === "segment" && typeof event.text === "string" && typeof event.start === "number") {
          const line = { start: event.start, text: event.text };
          lines.push(line);
          handlers.onLine(line);
        }
        if (event.type === "error" && typeof event.message === "string") {
          throw new Error(event.message);
        }
        if (event.type === "done") {
          language = typeof event.language === "string" ? event.language : null;
          duration = typeof event.duration === "number" ? event.duration : null;
          done = true;
        }
      }
    }

    if (handlers.isCancelled()) {
      await reader.cancel().catch(() => undefined);
      return null;
    }

    if (!done || lines.length === 0) {
      throw new Error("В этом видео не удалось распознать речь. Возможно, в нем отсутствует аудиодорожка.");
    }

    return { fileName: file.name, language, duration, lines };
  } catch (error) {
    if (handlers.isCancelled() || isAbortError(error)) return null;
    if (error instanceof TypeError) {
      throw new Error(
        "Локальная расшифровка не запущена. В папке transcribe выполните start.bat.",
      );
    }
    throw error;
  } finally {
    clearInterval(watch);
  }
}

export function transcriptToPlainText(result: TranscriptResult) {
  return result.lines
    .map((line) => `${formatTimestamp(line.start)}  ${line.text}`)
    .join("\n");
}

function parseEvent(part: string): Record<string, unknown> | null {
  const line = part.split("\n").find((item) => item.startsWith("data: "));
  if (!line) return null;
  try {
    const parsed: unknown = JSON.parse(line.slice(6));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
