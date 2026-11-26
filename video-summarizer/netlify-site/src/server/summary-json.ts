import { formatTimestamp, readingMinutes } from "../lib/format";
import type { Summary, SummaryChapter } from "../lib/types";

interface DraftChapter {
  seconds: number;
  title: string;
  body: string;
}

export function parseModelDraft(raw: string) {
  try {
    const data = extractJson(raw);
    if (!data || typeof data !== "object") return null;

    const record = data as { tldr?: unknown; chapters?: unknown };
    if (!Array.isArray(record.tldr) || !Array.isArray(record.chapters)) return null;

    const tldr = record.tldr
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => stripHtml(item.trim()))
      .slice(0, 5);

    if (tldr.length < 3) return null;

    const chapters: DraftChapter[] = [];
    for (const item of record.chapters) {
      if (!item || typeof item !== "object") continue;
      const row = item as { seconds?: unknown; title?: unknown; body?: unknown };
      if (typeof row.seconds !== "number" || !Number.isFinite(row.seconds)) continue;
      if (typeof row.title !== "string" || typeof row.body !== "string") continue;

      const title = stripHtml(row.title.trim());
      const body = stripHtml(row.body.trim());
      if (!title || !body) continue;
      chapters.push({ seconds: Math.round(row.seconds), title, body });
    }

    return { tldr, chapters };
  } catch {
    return null;
  }
}

export function attachTimestamps(chapters: DraftChapter[], allowedSeconds: number[]) {
  const allowed = [...new Set(allowedSeconds)].sort((left, right) => left - right);
  const used = new Set<number>();
  const result: SummaryChapter[] = [];

  for (const chapter of chapters) {
    const seconds = snapSeconds(chapter.seconds, allowed);
    if (seconds === null || used.has(seconds)) continue;
    used.add(seconds);
    result.push({
      seconds,
      time: formatTimestamp(seconds),
      title: chapter.title,
      body: chapter.body,
    });
  }

  return result.sort((left, right) => left.seconds - right.seconds).slice(0, 8);
}

export function assembleSummary(input: {
  tldr: string[];
  chapters: SummaryChapter[];
  videoId: string;
  canonicalUrl: string;
  title: string;
  author: string | null;
  thumbnail: string | null;
  durationSeconds: number | null;
}): Summary {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: "youtube",
    title: input.title,
    author: input.author,
    fileName: null,
    fileSizeLabel: null,
    thumbnail: input.thumbnail,
    youtubeId: input.videoId,
    youtubeUrl: input.canonicalUrl,
    readMinutes: readingMinutes([
      ...input.tldr,
      ...input.chapters.flatMap((chapter) => [chapter.title, chapter.body]),
    ]),
    durationSeconds: input.durationSeconds,
    tldr: input.tldr,
    chapters: input.chapters,
    demo: false,
  };
}

function extractJson(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no-json");
  return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
}

function snapSeconds(seconds: number, allowed: number[]) {
  let best: number | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (const offset of allowed) {
    const diff = Math.abs(offset - seconds);
    if (diff < bestDiff) {
      best = offset;
      bestDiff = diff;
    }
  }

  return best !== null && bestDiff <= 20 ? best : null;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").trim();
}
