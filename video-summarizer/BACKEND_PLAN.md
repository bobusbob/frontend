# План бэкенда SummaVideo

Версия плана: 1.0  
Для кого: программист, который подключает анализ к уже готовому экрану.  
Область этой версии: только ссылка на ролик YouTube.

Локальный файл в этой версии не обрабатывается. Экран загрузки файла уже есть, но Supadata принимает URL, а не файл с диска пользователя. Загрузка файла — отдельная задача.

---

## 1. Как должен работать сервис

Пользователь вставляет ссылку и нажимает «Создать краткое содержание». Сервер делает три вещи и возвращает карточку, которую экран уже умеет рисовать.

1. Проверяет, что это ссылка YouTube, и приводит её к виду `https://www.youtube.com/watch?v=ID`.
2. Запрашивает у Supadata транскрипт кусками с таймкодами. Если ролик большой, Supadata отвечает не текстом, а `jobId`. Сервер опрашивает задачу, пока транскрипт не будет готов.
3. Параллельно с транскриптом запрашивает у Supadata метаданные ролика: название, автора, длительность, обложку.
4. Отдаёт транскрипт в Gemini и просит вернуть только JSON: 3–5 тезисов и главы с таймкодами.
5. Проверяет JSON, привязывает таймкоды к реальным кускам транскрипта и собирает объект `Summary`.
6. Экран убирает пометку «пример» и показывает эту карточку. История по-прежнему хранится только в браузере.

Ключи Supadata и Gemini живут только на сервере. В браузер они не попадают.

```text
Браузер                         Наш сервер                      Supadata              Gemini
  |                                |                                |                    |
  | POST /api/summarize            |                                |                    |
  |------------------------------->|                                |                    |
  |                                | GET /v1/transcript             |                    |
  |                                |------------------------------->|                    |
  |                                | GET /v1/metadata               |                    |
  |                                |------------------------------->|                    |
  |  step: transcript              | 200 transcript  или  202 jobId |                    |
  |<-------------------------------|                                |                    |
  |                                | GET /v1/transcript/{jobId}     |                    |
  |                                |  пока status != completed      |                    |
  |  step: summarize               |                                |                    |
  |<-------------------------------|                                |                    |
  |                                | interactions.create            |                    |
  |                                |-------------------------------------------------->|
  |  result: Summary               | JSON выжимки                   |                    |
  |<-------------------------------|                                |                    |
```

Рекомендуемый транспорт — один POST и поток событий SSE. Отдельная база не нужна: задача живёт внутри одного запроса. Фронт по событиям двигает уже существующие три шага.

Запасной вариант, если поток окажется неудобным: обычный POST, который молчит до готовой карточки. Экран в это время показывает те же три шага по таймеру, как сейчас. Контракт карточки не меняется. Поток предпочтительнее, потому что шаги тогда соответствуют реальной работе, а не таймеру.

---

## 2. Куда класть код

Всё остаётся в `video-summarizer/convert Video`.

| Файл | Задача |
|---|---|
| `src/app/api/summarize/route.ts` | HTTP-вход, поток событий, сборка ответа |
| `src/server/supadata.ts` | Транскрипт, опрос задачи, метаданные |
| `src/server/prompt.ts` | Текст запроса в Gemini и сборка входа |
| `src/server/summarize.ts` | Вызов Gemini, разбор JSON, проверка таймкодов |
| `src/lib/summarize.ts` | Заменить демо на чтение потока. `summaryToMarkdown` не трогать |
| `.env.local` | Ключи. Файл не коммитить |

Пакеты:

```bash
npm install @google/genai
```

Отдельный SDK Supadata не нужен. Достаточно `fetch` по их HTTP-документации.

---

## 3. Переменные окружения

Файл `video-summarizer/convert Video/.env.local`:

```text
SUPADATA_API_KEY=
GEMINI_API_KEY=
```

В коде только `process.env.SUPADATA_API_KEY` и `process.env.GEMINI_API_KEY`. Префикс `NEXT_PUBLIC_` запрещён. Если ключа нет, сервер отвечает ошибкой конфигурации и не вызывает внешние API.

---

## 4. Контракт с уже готовым экраном

Карточка на экране — это тип `Summary` из `src/lib/types.ts`. Бэкенд возвращает тот же объект. Новые поля экрану не обязательны.

```ts
interface Summary {
  id: string;
  createdAt: string;
  source: "youtube";
  title: string;
  author: string | null;
  fileName: null;
  fileSizeLabel: null;
  thumbnail: string | null;
  youtubeId: string | null;
  youtubeUrl: string | null;
  readMinutes: number;
  tldr: string[];
  chapters: Array<{
    time: string;
    seconds: number;
    title: string;
    body: string;
  }>;
  demo: false;
}
```

`body` может содержать `**термин**`. Экран уже рисует это жирным. HTML в тексте не использовать.

События потока:

```ts
type SummarizeEvent =
  | { type: "step"; step: 0 | 1 | 2 }
  | { type: "result"; summary: Summary }
  | { type: "error"; code: "invalid-url" | "no-speech" | "network"; message: string };
```

Шаги совпадают с подписями на экране:

| step | Подпись на экране | Что происходит на самом деле |
|---|---|---|
| 0 | Получение аудиодорожки видео... | Запрос транскрипта и ожидание задачи Supadata |
| 1 | Распознавание речи и транскрибация... | Транскрипт уже получен. Шаг короткий |
| 2 | Выделение ключевых идей с помощью AI... | Запрос в Gemini |

---

## 5. Supadata: транскрипт

Базовый URL: `https://api.supadata.ai/v1`  
Ключ передаётся заголовком `x-api-key`.

Запрос транскрипта:

```ts
const endpoint = new URL("https://api.supadata.ai/v1/transcript");
endpoint.searchParams.set("url", canonicalYoutubeUrl);
endpoint.searchParams.set("lang", "ru");
endpoint.searchParams.set("text", "false");
endpoint.searchParams.set("mode", "auto");

const response = await fetch(endpoint, {
  headers: { "x-api-key": apiKey },
});
```

Параметры выбраны так:

- `text=false`. Ответ — массив кусков `{ text, offset, duration }`. `offset` и `duration` в миллисекундах. Из них получаются настоящие таймкоды. При `text=true` таймкоды пропадают, и модель начнёт их выдумывать.
- `mode=auto`. Сначала берутся готовые субтитры. Если их нет, Supadata сам строит транскрипт.
- `lang=ru`. Если русских субтитров нет, Supadata вернёт первый доступный язык. Выжимка всё равно пишется по-русски на шаге Gemini.

Ответ разбирается по HTTP-статусу, не только по форме JSON.

| Статус | Что делать |
|---|---|
| 200 | В теле транскрипт: `content` — массив кусков, плюс `lang` и `availableLangs` |
| 202 | В теле только `{ jobId }`. Опрашивать задачу |
| 206 | Речи нет. Отдать на экран `no-speech` |
| 400, 404 | Плохая или неизвестная ссылка. Отдать `invalid-url` |
| 401, 403 | Ключ или доступ. В лог — код, пользователю — общая ошибка сервиса |
| 402, 429 | Лимит Supadata. Пользователю — повторить позже |
| 500 и сеть | `network` |

Опрос задачи, если пришёл `jobId`:

```ts
async function waitForTranscript(jobId: string, apiKey: string) {
  const deadline = Date.now() + 90_000;
  let pause = 1500;

  while (Date.now() < deadline) {
    const response = await fetch(
      `https://api.supadata.ai/v1/transcript/${jobId}`,
      { headers: { "x-api-key": apiKey } },
    );

    if (!response.ok) {
      throw await toSupadataError(response);
    }

    const job = await response.json();

    if (job.status === "completed") {
      if (!Array.isArray(job.content) || job.content.length === 0) {
        throw Object.assign(new Error("empty"), { code: "no-speech" });
      }
      return job.content;
    }

    if (job.status === "failed") {
      throw mapJobError(job.error);
    }

    await delay(pause);
    pause = Math.min(pause + 500, 4000);
  }

  throw Object.assign(new Error("timeout"), { code: "network" });
}
```

Статусы задачи: `queued`, `active`, `completed`, `failed`. Пока статус `queued` или `active`, просто ждать. Не опрашивать чаще, чем раз в 1,5 секунды.

Пустой `content` и ошибка `transcript-unavailable` — это одно и то же для пользователя: «В этом видео не удалось распознать речь».

---

## 6. Метаданные ролика

Параллельно с транскриптом:

```ts
const metadataUrl = new URL("https://api.supadata.ai/v1/metadata");
metadataUrl.searchParams.set("url", canonicalYoutubeUrl);

const response = await fetch(metadataUrl, {
  headers: { "x-api-key": apiKey },
});
```

Из ответа 200 взять:

- `title`
- `author.displayName`
- `media.thumbnailUrl`
- `media.duration` — длительность в секундах

Если метаданные не пришли, карточку всё равно собирать. Название тогда берётся из превью, которое фронт уже получил через oEmbed. Длительность в этом случае не показывать. Не подставлять выдуманные минуты.

Метаданные не заменяют транскрипт и не идут в Gemini как источник фактов. В промпт можно передать только название и длительность, чтобы модель понимала масштаб ролика.

---

## 7. Подготовка текста для Gemini

Куски склеиваются в абзацы примерно по 700 символов. У абзаца остаётся таймкод его первого куска. Так модель видит ход ролика и не получает тысячи микрофрагментов.

```ts
function toPromptLines(chunks: Array<{ text: string; offset: number }>) {
  const lines: string[] = [];
  let start = chunks[0]?.offset ?? 0;
  let text = "";

  for (const chunk of chunks) {
    const piece = chunk.text.trim();
    if (!piece) continue;

    if (text.length >= 700) {
      lines.push(`[${formatTimestamp(start / 1000)}] ${text.trim()}`);
      start = chunk.offset;
      text = piece;
    } else {
      text = text ? `${text} ${piece}` : piece;
    }
  }

  if (text) {
    lines.push(`[${formatTimestamp(start / 1000)}] ${text.trim()}`);
  }

  return lines.join("\n");
}
```

Если после склейки текст длиннее 100 000 символов, оставить первую строку, последнюю и равномерную выборку между ними. В промпт добавить одну фразу: транскрипт сжат, но каждый таймкод в строке настоящий. Не отрезать ролик только с конца: иначе пропадёт финал.

Рядом сохранить множество допустимых секунд: `offset / 1000`, округление вниз. Им позже проверяется ответ модели.

---

## 8. Запрос в Gemini

Вызов строго такой, как в переданном примере. Модель `gemini-4-hydrogen`. Отдельного system-сообщения в этом вызове нет: инструкция и транскрипт лежат в одном `input`.

```ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const interaction = await ai.interactions.create({
  model: "gemini-4-hydrogen",
  input: prompt,
});

const raw = interaction.output_text;
```

Если `output_text` пустой, это ошибка вызова. Повторить запрос один раз. Второй провал — ошибка `network` для экрана.

### Какой промпт отправлять

Выжимка должна читаться как редакционная заметка, а не как пересказ «в видео говорят о». Тезисы — утверждения. Главы идут по времени ролика. Таймкоды модель может выбирать только из строк транскрипта.

Язык карточки — русский, даже если ролик на другом языке. Интерфейс русский, и пользователь ждёт русскую выжимку. Имена, числа и термины не переводить, если перевод их портит.

```ts
function buildPrompt(input: {
  title: string;
  durationSeconds: number | null;
  transcript: string;
}) {
  const durationLine = input.durationSeconds
    ? `Длительность ролика: ${Math.round(input.durationSeconds / 60)} мин.`
    : "Длительность ролика неизвестна.";

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

Транскрипт. Формат строки: [мм:сс] текст.
${input.transcript}

Схема ответа:
{"tldr":["строка"],"chapters":[{"seconds":45,"title":"строка","body":"строка"}]}`;
}
```

Повторный запрос, если первый ответ не разобрался как JSON, отличается одной первой строкой:

```text
Предыдущий ответ не был валидным JSON. Верни заново только JSON по схеме, без единого символа вокруг него.
```

Дальше тот же промпт. Больше одного повтора не делать.

---

## 9. Проверка ответа и сборка карточки

Модель иногда оборачивает JSON в \`\`\`json. Это нужно снять до `JSON.parse`.

```ts
function extractJson(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("no-json");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}
```

Дальше жёсткая проверка:

- `tldr` — массив из 3–5 непустых строк. Лишнее отрезать. Если меньше трёх, ответ негодный.
- `chapters` — массив объектов с числом `seconds`, непустыми `title` и `body`.
- `seconds` привязать к ближайшему реальному куску транскрипта. Если ближайший кусок дальше 20 секунд, главу выбросить.
- Поле `time` посчитать на сервере из проверенных секунд. Строку времени от модели не использовать.
- Одинаковые секунды у соседних глав схлопнуть: оставить первую.
- Глав должно остаться не меньше трёх. Иначе один повтор Gemini. Если и он плохой — ошибка `network`, пользователю можно нажать «Попробовать снова».
- Из `body` убрать HTML-теги, если модель их всё же вставила. `**звёздочки**` оставить.

Формат таймкода:

```ts
function formatTimestamp(totalSeconds: number) {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
```

Время чтения посчитать по уже существующей логике фронта: все слова тезисов и глав разделить на 160 и округлить, минимум 1 минута.

Сборка:

```ts
const summary: Summary = {
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  source: "youtube",
  title: metadata?.title || fallbackTitle,
  author: metadata?.author?.displayName || null,
  fileName: null,
  fileSizeLabel: null,
  thumbnail: metadata?.media?.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  youtubeId: videoId,
  youtubeUrl: canonicalYoutubeUrl,
  readMinutes,
  tldr,
  chapters,
  demo: false,
};
```

`demo: false` обязателен. Иначе экран оставит плашку «это пример».

---

## 10. Ошибки для экрана

Экран уже понимает коды `invalid-url`, `no-speech` и `network`. Новые коды не вводить.

| Ситуация | code | Текст пользователю |
|---|---|---|
| Ссылка не YouTube | `invalid-url` | Пожалуйста, проверьте ссылку. Поддерживаются форматы youtube.com/watch?v=... и youtu.be/... |
| 206, пустой транскрипт, `transcript-unavailable` | `no-speech` | В этом видео не удалось распознать речь. Возможно, в нем отсутствует аудиодорожка |
| Лимит, обрыв, Gemini не ответил, JSON дважды не разобрался | `network` | Не удалось выполнить запрос. Проверьте сеть и попробуйте снова. |
| Нет ключа на сервере | `network` | Тот же текст. Подробность только в серверный лог |

В ответ и в лог не попадают ключи и полный транскрипт.

---

## 11. Маршрут и поток

`src/app/api/summarize/route.ts`:

```ts
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url : "";
  const videoId = extractYoutubeId(url);

  if (!videoId) {
    return Response.json(
      {
        type: "error",
        code: "invalid-url",
        message:
          "Пожалуйста, проверьте ссылку. Поддерживаются форматы youtube.com/watch?v=... и youtu.be/...",
      },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        send({ type: "step", step: 0 });
        const canonical = `https://www.youtube.com/watch?v=${videoId}`;
        const [chunks, metadata] = await Promise.all([
          loadTranscript(canonical),
          loadMetadata(canonical).catch(() => null),
        ]);

        send({ type: "step", step: 1 });
        send({ type: "step", step: 2 });

        const summary = await summarizeTranscript({
          videoId,
          canonical,
          chunks,
          metadata,
        });

        send({ type: "result", summary });
      } catch (error) {
        send({
          type: "error",
          code: readCode(error),
          message: readMessage(error),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
```

`loadTranscript` сам решает, был ли ответ 200 или нужно ждать `jobId`.

Один запрос может идти до минуты: опрос Supadata плюс Gemini. На площадке, где функция обрывается раньше, этот же маршрут переносится на обычный Node-процесс. Контракт событий не меняется.

Пока запрос идёт, повторный клик на экране отменяется через `AbortController`. Сигнал нужно передать в `fetch` к Supadata и не вызывать Gemini, если клиент уже ушёл.

---

## 12. Правка фронтенда

Меняется только `createSummary` в `src/lib/summarize.ts`. Шаги, карточка, копирование и история остаются.

```ts
export async function createSummary(request, onStep, isCancelled) {
  if (request.mode !== "youtube" || !request.youtubeUrl) {
    throw Object.assign(new Error("file"), { code: "network" });
  }

  onStep(0);

  const response = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: request.youtubeUrl }),
  });

  if (!response.ok || !response.body) {
    throw Object.assign(new Error("http"), { code: "network" });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!isCancelled()) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.split("\n").find((item) => item.startsWith("data: "));
      if (!line) continue;
      const event = JSON.parse(line.slice(6));

      if (event.type === "step") onStep(event.step);
      if (event.type === "error") {
        throw Object.assign(new Error(event.message), { code: event.code });
      }
      if (event.type === "result") return event.summary;
    }
  }

  return null;
}
```

`home-screen.tsx` уже превращает исключение с полем `code` в карточку ошибки. Нужно прокинуть `error.code`, если он есть, а не всегда подставлять `network`.

Для режима «файл» кнопку оставить, но сервер файлы не принимает. На экране для этого режима показать, что загрузка файла появится отдельно. Не отправлять файл на Supadata.

После успешного ответа плашка «Пример структуры» исчезает сама, потому что `demo` равен `false`.

---

## 13. Порядок работы программиста

1. Положить ключи в `.env.local` и убедиться, что файл в `.gitignore`.
2. Написать `supadata.ts` и проверить на коротком ролике два случая: сразу 200 и, если получится поймать, 202 с опросом.
3. Написать склейку кусков и промпт. Временно печатать промпт в лог только локально.
4. Подключить Gemini и разбор JSON. Прогнать один ролик и глазами проверить, что секунды есть в транскрипте.
5. Собрать `Summary` и отдать его потоком из `route.ts`.
6. Заменить демо в `createSummary`.
7. Пройти сценарии из раздела проверки.

Не начинать с экрана. Сначала один скрипт или один маршрут, который по ссылке печатает готовую карточку.

---

## 14. Как проверить

Короткий ролик с субтитрами, например `https://youtu.be/jNQXAC9IVRw`:

- шаг 0 загорается сразу после клика;
- карточка приходит без плашки «пример»;
- у каждой главы таймкод открывает YouTube с `t=` в секундах;
- «Копировать» и «Скачать Markdown» содержат эти же главы;
- карточка появляется в «Недавних» после обновления страницы.

Плохая ссылка `https://vimeo.com/123` не вызывает Supadata и показывает текст про формат YouTube.

Ролик без речи или ответ 206 показывает текст про аудиодорожку и кнопку «Попробовать снова».

Обрыв Gemini или невалидный JSON два раза подряд показывает сетевую ошибку, а не полупустую карточку.

В логах нет ключей и нет полного транскрипта.

---

## 15. Что не делать в этой версии

- Не принимать локальный файл и не хранить видео.
- Не писать транскрипты и выжимки в базу. Три последние карточки по-прежнему лежат в `localStorage`.
- Не вызывать Supadata и Gemini из браузера.
- Не просить у Gemini сплошной пересказ без JSON.
- Не доверять таймкодам модели без сверки с `offset` кусков.
- Не делать вид, что шаг «загрузка файла» уже анализирует диск пользователя.
