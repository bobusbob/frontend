import { formatBytes, pluralMinutes } from "@/lib/format";
import type { Summary, SummaryChapter, SummaryRequest } from "@/lib/types";
import { extractYoutubeId, fetchYoutubePreview } from "@/lib/youtube";

export const WAITING_TIPS = [
  "В среднем это экономит до 85% времени на просмотр лекций и подкастов",
  "Таймкод в выжимке открывает YouTube сразу на нужной минуте",
  "Три последние карточки остаются в браузере — аккаунт не нужен",
  "Готовый текст можно забрать в Markdown и вставить в заметки",
];

/**
 * Точка подключения будущего API.
 * Сейчас функция только имитирует шаги и возвращает пример карточки.
 * Видеофайл и ссылка никуда не отправляются.
 */
export async function createSummary(
  request: SummaryRequest,
  onStep: (index: number) => void,
  isCancelled: () => boolean,
): Promise<Summary | null> {
  onStep(0);
  const started = Date.now();

  let youtube = request.youtube;
  if (request.mode === "youtube" && request.youtubeUrl) {
    const fetched = await fetchYoutubePreview(request.youtubeUrl);
    if (isCancelled()) return null;
    if (fetched) youtube = fetched;
  }

  const elapsed = Date.now() - started;
  if (elapsed < 800) await wait(800 - elapsed, isCancelled);

  if (isCancelled()) return null;
  onStep(1);
  await wait(1100, isCancelled);

  if (isCancelled()) return null;
  onStep(2);
  await wait(1000, isCancelled);

  if (isCancelled()) return null;
  onStep(3);

  return buildPreview({ ...request, youtube });
}

export function summaryToMarkdown(summary: Summary) {
  const source =
    summary.source === "youtube"
      ? `YouTube${summary.author ? ` · ${summary.author}` : ""}`
      : `Файл${summary.fileName ? ` · ${summary.fileName}` : ""}`;

  const lines = [
    `# ${summary.title}`,
    "",
    `Источник: ${source}`,
    `Чтение: ~ ${pluralMinutes(summary.readMinutes)}`,
    summary.youtubeUrl ? `Ссылка: ${summary.youtubeUrl}` : null,
    "",
    "> Пример интерфейса. Это не результат распознавания: анализ видео ещё не подключён.",
    "",
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

function buildPreview(request: SummaryRequest): Summary {
  const youtubeId =
    request.youtube?.id ??
    (request.youtubeUrl ? extractYoutubeId(request.youtubeUrl) : null);
  const title =
    request.mode === "youtube"
      ? request.youtube?.title || "Видео YouTube"
      : stripExtension(request.file?.name || "Локальное видео");

  const chapters = previewChapters(title);
  const tldr = [
    "Короткая выжимка собирает главные мысли ролика, чтобы не смотреть его целиком.",
    "Главы стоят по таймкодам: для YouTube каждый бейдж открывает нужный фрагмент.",
    "Сейчас на экране пример структуры. Само видео никуда не отправляется.",
  ];

  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    source: request.mode,
    title,
    author: request.mode === "youtube" ? request.youtube?.author || null : null,
    fileName: request.file?.name ?? null,
    fileSizeLabel: request.file ? formatBytes(request.file.size) : null,
    thumbnail: request.youtube?.thumbnail ?? null,
    youtubeId,
    youtubeUrl: request.youtube?.url ?? null,
    readMinutes: readingMinutes(tldr, chapters),
    tldr,
    chapters,
    demo: true,
  };
}

function previewChapters(title: string): SummaryChapter[] {
  return [
    {
      time: "00:45",
      seconds: 45,
      title: "Зачем читать выжимку вместо всего ролика",
      body: "Длинные лекции редко держат одну мысль от начала до конца. Карточка оставляет **ключевой тезис**, короткий контекст и то, что можно не пересматривать.",
    },
    {
      time: "04:12",
      seconds: 4 * 60 + 12,
      title: "Как устроена будущая обработка",
      body: "Сначала отделяется **аудиодорожка**, затем речь превращается в текст. После этого модель убирает повторы и собирает главы с таймкодами.",
    },
    {
      time: "12:03",
      seconds: 12 * 60 + 3,
      title: "Что можно забрать с собой",
      body: "Текст можно **скопировать** или скачать в Markdown. Для ролика YouTube таймкод открывает видео сразу на этой минуте.",
    },
    {
      time: "18:40",
      seconds: 18 * 60 + 40,
      title: "Что показывает эта версия",
      body: `Анализ речи ещё не подключён. Карточка показывает интерфейс результата для источника «${title}»: чтение, экспорт, тему и историю в браузере.`,
    },
  ];
}

function readingMinutes(tldr: string[], chapters: SummaryChapter[]) {
  const plain = [...tldr, ...chapters.flatMap((chapter) => [chapter.title, chapter.body])]
    .join(" ")
    .replaceAll("**", "");
  const words = plain.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 160));
}

function stripExtension(name: string) {
  return name.replace(/\.[a-z0-9]+$/i, "");
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sum-${Date.now()}`;
}

function wait(ms: number, isCancelled: () => boolean) {
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      clearInterval(poll);
      resolve();
    }, ms);

    const poll = setInterval(() => {
      if (!isCancelled()) return;
      clearTimeout(timeout);
      clearInterval(poll);
      resolve();
    }, 40);
  });
}
