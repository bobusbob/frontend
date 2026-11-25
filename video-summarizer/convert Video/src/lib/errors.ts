import type { AppError, AppErrorCode } from "@/lib/types";

const COPY: Record<AppErrorCode, Pick<AppError, "title" | "message">> = {
  "invalid-url": {
    title: "Некорректная ссылка",
    message:
      "Пожалуйста, проверьте ссылку. Поддерживаются форматы youtube.com/watch?v=... и youtu.be/...",
  },
  "file-too-large": {
    title: "Файл слишком большой",
    message:
      "Размер файла превышает 500 МБ. Пожалуйста, сожмите видео или используйте YouTube-ссылку.",
  },
  "unsupported-format": {
    title: "Формат не поддерживается",
    message: "Загрузите видео в формате MP4, MOV, WebM или MKV.",
  },
  "empty-file": {
    title: "Пустой файл",
    message: "Файл не содержит данных. Выберите другое видео.",
  },
  "no-speech": {
    title: "Речь не найдена",
    message:
      "В этом видео не удалось распознать речь. Возможно, в нем отсутствует аудиодорожка.",
  },
  network: {
    title: "Нет соединения",
    message: "Не удалось выполнить запрос. Проверьте сеть и попробуйте снова.",
  },
};

export function errorOf(code: AppErrorCode): AppError {
  return { code, ...COPY[code] };
}

export class SummarizeError extends Error {
  code: AppErrorCode;

  constructor(code: AppErrorCode, message?: string) {
    super(message ?? COPY[code].message);
    this.name = "SummarizeError";
    this.code = code;
  }
}
