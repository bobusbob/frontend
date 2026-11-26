import { SummarizeError } from "@/lib/errors";
import { pluralMinutes } from "@/lib/format";
import type { Summary, SummaryRequest, SummarizeFailureCode } from "@/lib/types";

export const WAITING_TIPS = [
  "В среднем это экономит до 85% времени на просмотр лекций и подкастов",
  "Таймкод в выжимке открывает YouTube сразу на нужной минуте",
  "Три последние карточки остаются в браузере — аккаунт не нужен",
  "Готовый текст можно забрать в Markdown и вставить в заметки",
];

const FILE_MESSAGE =
  "Эта публикация принимает только ссылку YouTube.";
const POLL_MS = 1500;
const DEADLINE_MS = 160_000;

export async function createSummary(
  request: SummaryRequest,
  onStep: (index: number) => void,
  isCancelled: () => boolean,
): Promise<Summary | null> {
  if (request.mode !== "youtube" || !request.youtubeUrl) {
    throw new SummarizeError("network", FILE_MESSAGE);
  }

  onStep(0);
  const created = await fetch("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: request.youtubeUrl }),
  });

  if (isCancelled()) return null;
  if (!created.ok) {
    const payload = await created.json().catch(() => null);
    throw errorFromPayload(payload);
  }

  const createdBody = (await created.json()) as { jobId?: unknown };
  if (typeof createdBody.jobId !== "string") throw new SummarizeError("network");

  const deadline = Date.now() + DEADLINE_MS;
  let missing = 0;

  while (!isCancelled() && Date.now() < deadline) {
    const response = await fetch(`/api/jobs/${createdBody.jobId}`, { cache: "no-store" });
    if (isCancelled()) return null;

    if (response.status === 404) {
      missing += 1;
      if (missing > 8) throw new SummarizeError("network");
    } else if (!response.ok) {
      throw new SummarizeError("network");
    } else {
      const job = (await response.json()) as {
        status?: string;
        step?: number;
        summary?: Summary;
        code?: unknown;
        message?: unknown;
      };
      if (job.step === 0 || job.step === 1 || job.step === 2) onStep(job.step);
      if (
        job.status === "done" &&
        job.summary &&
        job.summary.demo === false &&
        Array.isArray(job.summary.chapters)
      ) {
        return job.summary;
      }
      if (job.status === "error") {
        throw new SummarizeError(
          isFailureCode(job.code) ? job.code : "network",
          typeof job.message === "string" ? job.message : undefined,
        );
      }
    }

    await delay(POLL_MS);
  }

  if (isCancelled()) return null;
  throw new SummarizeError("network", "Выжимка не успела собраться. Попробуйте ещё раз.");
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

function errorFromPayload(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "code" in payload &&
    "message" in payload &&
    isFailureCode(payload.code) &&
    typeof payload.message === "string"
  ) {
    return new SummarizeError(payload.code, payload.message);
  }

  return new SummarizeError("network");
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isFailureCode(value: unknown): value is SummarizeFailureCode {
  return value === "invalid-url" || value === "no-speech" || value === "network";
}

