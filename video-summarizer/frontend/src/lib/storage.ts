import type { Summary } from "@/lib/types";

const HISTORY_KEY = "summavideo.history";
const HISTORY_EVENT = "summavideo-history";
const HISTORY_LIMIT = 3;
const EMPTY_HISTORY: Summary[] = [];

let cachedRaw: string | null = null;
let cachedHistory: Summary[] = EMPTY_HISTORY;

function isSummary(value: unknown): value is Summary {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Summary>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    Array.isArray(item.tldr) &&
    Array.isArray(item.chapters)
  );
}

function sameSource(left: Summary, right: Summary) {
  if (left.youtubeId && left.youtubeId === right.youtubeId) return true;
  if (
    left.fileName &&
    left.fileName === right.fileName &&
    left.fileSizeLabel === right.fileSizeLabel
  ) {
    return true;
  }
  return false;
}

function parseHistory(raw: string) {
  if (!raw) return EMPTY_HISTORY;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_HISTORY;
    return parsed.filter(isSummary).slice(0, HISTORY_LIMIT);
  } catch {
    return EMPTY_HISTORY;
  }
}

function readHistoryRaw() {
  try {
    return localStorage.getItem(HISTORY_KEY) ?? "";
  } catch {
    return "";
  }
}

export function subscribeHistory(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(HISTORY_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(HISTORY_EVENT, onStoreChange);
  };
}

export function getHistorySnapshot() {
  const raw = readHistoryRaw();
  if (raw === cachedRaw) return cachedHistory;
  cachedRaw = raw;
  cachedHistory = parseHistory(raw);
  return cachedHistory;
}

export function getServerHistorySnapshot() {
  return EMPTY_HISTORY;
}

function publishHistory(items: Summary[]) {
  const raw = JSON.stringify(items);
  localStorage.setItem(HISTORY_KEY, raw);
  cachedRaw = raw;
  cachedHistory = items;
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function rememberSummary(summary: Summary) {
  const next = [summary, ...getHistorySnapshot().filter((item) => !sameSource(item, summary))].slice(
    0,
    HISTORY_LIMIT,
  );

  try {
    publishHistory(next);
  } catch {
    return;
  }
}

export function clearHistory() {
  try {
    cachedRaw = "";
    cachedHistory = EMPTY_HISTORY;
    localStorage.removeItem(HISTORY_KEY);
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {
    return;
  }
}
