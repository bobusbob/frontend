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
