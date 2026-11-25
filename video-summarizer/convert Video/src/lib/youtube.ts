import type { YoutubePreview } from "@/lib/types";

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function isYoutubeId(value: string) {
  return ID_PATTERN.test(value);
}

export function extractYoutubeId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return isYoutubeId(id) ? id : null;
  }

  if (
    host === "youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    const fromQuery = url.searchParams.get("v");
    if (fromQuery && isYoutubeId(fromQuery)) return fromQuery;

    const [head, id] = url.pathname.split("/").filter(Boolean);
    if (
      head &&
      id &&
      ["embed", "shorts", "live", "v"].includes(head) &&
      isYoutubeId(id)
    ) {
      return id;
    }
  }

  return null;
}

export function canonicalYoutubeUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function youtubeTimestampUrl(id: string, seconds: number) {
  return `https://www.youtube.com/watch?v=${id}&t=${seconds}s`;
}

export function youtubeThumbnail(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function readString(data: unknown, key: string) {
  if (!data || typeof data !== "object" || !(key in data)) return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function fetchYoutubePreview(raw: string): Promise<YoutubePreview | null> {
  const id = extractYoutubeId(raw);
  if (!id) return null;

  const preview: YoutubePreview = {
    id,
    url: canonicalYoutubeUrl(id),
    title: "Видео YouTube",
    author: "YouTube",
    thumbnail: youtubeThumbnail(id),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(preview.url)}&format=json`,
      { signal: controller.signal },
    );
    if (!response.ok) return preview;

    const data: unknown = await response.json();
    return {
      ...preview,
      title: readString(data, "title") ?? preview.title,
      author: readString(data, "author_name") ?? preview.author,
    };
  } catch {
    return preview;
  } finally {
    clearTimeout(timeout);
  }
}
