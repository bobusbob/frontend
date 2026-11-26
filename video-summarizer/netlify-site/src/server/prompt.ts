import { formatTimestamp } from "../lib/format";
import type { TranscriptChunk } from "./supadata";

const LINE_LIMIT = 700;
const TRANSCRIPT_LIMIT = 100_000;

export function prepareTranscript(chunks: TranscriptChunk[]) {
  const lines = toPromptLines(chunks);
  const allowedSeconds = [...new Set(chunks.map((chunk) => Math.floor(chunk.offset / 1000)))].sort(
    (left, right) => left - right,
  );
  const thinned = thinLines(lines, TRANSCRIPT_LIMIT);

  return {
    transcript: thinned.text,
    compressed: thinned.compressed,
    allowedSeconds,
  };
}

export function buildPrompt(input: {
  title: string;
  durationSeconds: number | null;
  transcript: string;
  compressed: boolean;
}) {
  const durationLine = input.durationSeconds
    ? `Длительность ролика: ${Math.round(input.durationSeconds / 60)} мин.`
    : "Длительность ролика неизвестна.";
  const compressionLine = input.compressed
    ? "Транскрипт сжат: оставлены фрагменты по всей длине ролика. Таймкоды в скобках настоящие.\n"
    : "";

  return `Ты редактор коротких выжимок видео. По транскрипту собери карточку, которую можно прочитать вместо просмотра.

Верни только один JSON-объект. Без пояснений, без Markdown-ограждения и без текста до или после JSON.

Язык всех строк: русский.
Опирайся только на транскрипт. Не добавляй фактов, советов и выводов, которых в нём нет.
Не пиши «в этом видео», «автор рассказывает», «далее говорится». Сразу формулируй мысль.

Поля:
- tldr: от 3 до 5 пунктов. Каждый пункт — одно законченное предложение. Вместе они отвечают на вопрос «что я должен понять за 30 секунд».
- chapters: логические главы по ходу ролика.
  - Если ролик короче 8 минут — 3 или 4 главы.
  - Если от 8 до 30 минут — от 4 до 6 глав.
  - Если длиннее 30 минут — от 6 до 8 глав.
- seconds: целое число секунд. Бери его только из таймкода в квадратных скобках выбранной строки. Не вычисляй новый таймкод и не ставь 0, если мысль начинается позже.
- title: короткий тезис главы, не служебная подпись вроде «Вступление» или «Заключение».
- body: 2–4 предложения. Самые важные термины оберни ровно так: **термин**. Не используй HTML.

Название ролика: ${input.title}
${durationLine}
${compressionLine}
Транскрипт. Формат строки: [мм:сс] текст.
${input.transcript}

Схема ответа:
{"tldr":["строка"],"chapters":[{"seconds":45,"title":"строка","body":"строка"}]}`;
}

export function retryPrefix() {
  return "Предыдущий ответ не был валидным JSON. Верни заново только JSON по схеме, без единого символа вокруг него.";
}

function toPromptLines(chunks: TranscriptChunk[]) {
  const lines: string[] = [];
  let start = chunks[0]?.offset ?? 0;
  let text = "";

  for (const chunk of chunks) {
    const piece = chunk.text.trim();
    if (!piece) continue;

    if (text.length >= LINE_LIMIT) {
      lines.push(`[${formatTimestamp(start / 1000)}] ${text.trim()}`);
      start = chunk.offset;
      text = piece;
    } else {
      text = text ? `${text} ${piece}` : piece;
    }
  }

  if (text) lines.push(`[${formatTimestamp(start / 1000)}] ${text.trim()}`);
  return lines;
}

function thinLines(lines: string[], maxChars: number) {
  const full = lines.join("\n");
  if (full.length <= maxChars || lines.length < 3) {
    return { text: full.slice(0, maxChars), compressed: full.length > maxChars };
  }

  let stride = 1;
  let selected = lines;

  while (selected.join("\n").length > maxChars && stride < lines.length) {
    stride += 1;
    const middle = lines.slice(1, -1).filter((_, index) => index % stride === 0);
    selected = [lines[0], ...middle, lines[lines.length - 1]];
  }

  return { text: selected.join("\n").slice(0, maxChars), compressed: true };
}
