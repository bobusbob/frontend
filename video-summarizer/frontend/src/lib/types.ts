export type SourceMode = "youtube" | "file";

export type AppPhase = "idle" | "processing" | "result" | "error";

export type AppErrorCode =
  | "invalid-url"
  | "file-too-large"
  | "unsupported-format"
  | "empty-file"
  | "no-speech"
  | "network";

export interface AppError {
  code: AppErrorCode;
  title: string;
  message: string;
}

export interface YoutubePreview {
  id: string;
  url: string;
  title: string;
  author: string;
  thumbnail: string;
}

export interface SummaryChapter {
  time: string;
  seconds: number;
  title: string;
  body: string;
}

export interface Summary {
  id: string;
  createdAt: string;
  source: SourceMode;
  title: string;
  author: string | null;
  fileName: string | null;
  fileSizeLabel: string | null;
  thumbnail: string | null;
  youtubeId: string | null;
  youtubeUrl: string | null;
  readMinutes: number;
  tldr: string[];
  chapters: SummaryChapter[];
  /** Пока нет бэкенда, карточка — пример структуры, а не анализ ролика. */
  demo: boolean;
}

export interface SummaryRequest {
  mode: SourceMode;
  youtubeUrl?: string;
  youtube: YoutubePreview | null;
  file: { name: string; size: number } | null;
}
