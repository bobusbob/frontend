import { SummarizeError } from "@/lib/errors";
import { pluralMinutes } from "@/lib/format";
import type { Summary, SummaryRequest, SummarizeEvent, SummarizeFailureCode } from "@/lib/types";

export const WAITING_TIPS = [
  "В среднем это экономит до 85% времени на просмотр лекций и подкастов",
  "Таймкод в выжимке открывает YouTube сразу на нужной минуте",
  "Три последние карточки остаются в браузере — аккаунт не нужен",
  "Готовый текст можно забрать в Markdown и вставить в заметки",
];

const FILE_MESSAGE =
  "Анализ файла с компьютера появится отдельно. Сейчас можно вставить ссылку YouTube.";

export async function createSummary(
  request: SummaryRequest,
  onStep: (index: number) => void,
  isCancelled: () => boolean,
): Promise<Summary | null> {
  if (request.mode !== "youtube" || !request.youtubeUrl) {
    throw new SummarizeError("network", FILE_MESSAGE);
  }

  const controller = new AbortController();
  const watch = setInterval(() => {
    if (isCancelled()) controller.abort();
  }, 50);

  try {
    onStep(0);
    const response = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: request.youtubeUrl }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw errorFromPayload(payload);
    }

    if (!response.body) throw new SummarizeError("network");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let summary: Summary | null = null;

    while (!isCancelled()) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const event = parseEvent(part);
        if (!event) continue;
        if (event.type === "step") onStep(event.step);
        if (event.type === "error") throw new SummarizeError(event.code, event.message);
        if (event.type === "result") summary = event.summary;
      }
    }

    if (isCancelled()) {
      await reader.cancel().catch(() => undefined);
      return null;
    }

    if (!summary || summary.demo !== false || !Array.isArray(summary.chapters)) {
      throw new SummarizeError("network");
    }

    return summary;
  } catch (error) {
    if (isCancelled() || isAbortError(error)) return null;
    throw error;
  } finally {
    clearInterval(watch);
  }
}

export function summaryToMarkdown(summary: Summary) {
  const source =
    summary.source === "youtube"
      ? `YouTube${summary.author ? ` · ${summary.author}` : ""}`
      : `Файл${summary.fileName ? ` · ${summary.fileName}` : ""}`;
  const duration =
    typeof summary.durationSeconds === "number" && summary.durationSeconds >= 45
      ? `Длительность: ${pluralMinutes(Math.max(1, Math.round(summary.durationSeconds / 60)))}`
      : null;

  const lines = [
    `# ${summary.title}`,
    "",
    `Источник: ${source}`,
    duration,
    `Чтение: ~ ${pluralMinutes(summary.readMinutes)}`,
    summary.youtubeUrl ? `Ссылка: ${summary.youtubeUrl}` : null,
    "",
    summary.demo
      ? "> Пример интерфейса. Это не результат распознавания: анализ видео ещё не подключён."
      : null,
    summary.demo ? "" : null,
    "## Главное за 30 секунд",
    "",
    ...summary.tldr.map((item) => `- ${item}`),
    "",
    "## Структура по главам",
    ...summary.chapters.flatMap((chapter) => [
      "",
      `### ${chapter.time} — ${chapter.title}`,
      "",
      chapter.body,
    ]),
    "",
  ];

  return lines.filter((line) => line !== null).join("\n");
}

function parseEvent(part: string): SummarizeEvent | null {
  const line = part.split("\n").find((item) => item.startsWith("data: "));
  if (!line) return null;

  try {
    return JSON.parse(line.slice(6)) as SummarizeEvent;
  } catch {
    return null;
  }
}

function errorFromPayload(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "type" in payload &&
    payload.type === "error" &&
    "code" in payload &&
    "message" in payload &&
    isFailureCode(payload.code) &&
    typeof payload.message === "string"
  ) {
    return new SummarizeError(payload.code, payload.message);
  }

  return new SummarizeError("network");
}

function isFailureCode(value: unknown): value is SummarizeFailureCode {
  return value === "invalid-url" || value === "no-speech" || value === "network";
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
