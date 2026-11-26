import { errorOf } from "@/lib/errors";
import type { AppError } from "@/lib/types";

export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set(["mp4", "mov", "webm", "mkv"]);

export function fileExtension(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? (parts.pop() ?? "") : "";
}

export function validateVideoFile(file: File): AppError | null {
  if (!ALLOWED_EXTENSIONS.has(fileExtension(file.name))) {
    return errorOf("unsupported-format");
  }

  if (file.size <= 0) {
    return errorOf("empty-file");
  }

  if (file.size > MAX_VIDEO_BYTES) {
    return errorOf("file-too-large");
  }

  return null;
}
