export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} Б`;

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${trimNumber(kilobytes)} КБ`;
  }

  const megabytes = kilobytes / 1024;
  if (megabytes < 1024) {
    return `${trimNumber(megabytes)} МБ`;
  }

  return `${(megabytes / 1024).toFixed(2)} ГБ`;
}

function trimNumber(value: number) {
  return value >= 10 ? value.toFixed(0) : value.toFixed(1);
}

export function readingMinutes(parts: string[]) {
  const words = parts
    .join(" ")
    .replaceAll("**", "")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 160));
}

export function formatTimestamp(totalSeconds: number) {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDuration(totalSeconds: number) {
  const total = Math.max(0, Math.round(totalSeconds));
  if (total < 60) {
    const mod10 = total % 10;
    const mod100 = total % 100;
    const word =
      mod10 === 1 && mod100 !== 11
        ? "секунда"
        : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
          ? "секунды"
          : "секунд";
    return `${Math.max(1, total)} ${word}`;
  }
  return pluralMinutes(Math.max(1, Math.round(total / 60)));
}

export function pluralMinutes(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value} минута`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${value} минуты`;
  }
  return `${value} минут`;
}

export function formatCreatedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return slug || "summary";
}
