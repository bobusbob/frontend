"""Локальная расшифровка видео. Файл не уходит с компьютера.

Запуск из папки transcribe:
  .venv\\Scripts\\python server.py
"""

from __future__ import annotations

import json
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

HOST = "127.0.0.1"
PORT = 8765
MAX_BYTES = 500 * 1024 * 1024
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv"}
MODEL_NAME = "small"

busy = threading.Lock()
model = None
model_lock = threading.Lock()


class TranscribeHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/health":
            self._json(200, {"ok": True, "busy": busy.locked()})
            return
        if self.path in ("/", "/index.html"):
            self._html()
            return
        self._json(404, {"message": "Не найдено."})

    def do_POST(self) -> None:
        if self.path != "/transcribe":
            self._json(404, {"message": "Не найдено."})
            return

        length = int(self.headers.get("Content-Length", "0") or "0")
        suffix = Path(unquote(self.headers.get("X-Filename", "video.mp4"))).suffix.lower()

        if suffix not in ALLOWED_EXTENSIONS:
            self._json(400, {"message": "Поддерживаются файлы MP4, MOV, WebM и MKV."})
            return
        if length <= 0:
            self._json(400, {"message": "Файл пустой."})
            return
        if length > MAX_BYTES:
            self._json(413, {"message": "Размер файла превышает 500 МБ."})
            return
        if not busy.acquire(blocking=False):
            self._json(409, {"message": "Уже идёт другая расшифровка. Дождитесь её окончания."})
            return

        temporary = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        try:
            remaining = length
            while remaining > 0:
                chunk = self.rfile.read(min(1024 * 1024, remaining))
                if not chunk:
                    break
                temporary.write(chunk)
                remaining -= len(chunk)
            temporary.close()

            if remaining > 0:
                self._json(400, {"message": "Файл загрузился не полностью."})
                return

            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Transfer-Encoding", "chunked")
            self.end_headers()
            self._transcribe(temporary.name)
            self._finish()
        except Exception as error:
            if getattr(self, "_stream_started", False):
                try:
                    self._event({"type": "error", "message": "Расшифровка прервалась."})
                    self._finish()
                except Exception:
                    pass
            else:
                self._json(500, {"message": "Не удалось начать расшифровку."})
            print(f"transcribe error: {type(error).__name__}", file=sys.stderr)
        finally:
            temporary.close()
            Path(temporary.name).unlink(missing_ok=True)
            busy.release()

    def _transcribe(self, path: str) -> None:
        self._stream_started = True
        self._event(
            {
                "type": "status",
                "message": "Загружаем модель распознавания. Первый запуск скачивает её один раз.",
            }
        )
        recognizer = get_model()
        self._event({"type": "status", "message": "Распознаём речь. Это может занять столько же, сколько длится видео."})

        segments, info = recognizer.transcribe(path, vad_filter=True, beam_size=5)
        count = 0
        for segment in segments:
            text = segment.text.strip()
            if not text:
                continue
            count += 1
            self._event({"type": "segment", "start": round(segment.start, 2), "text": text})

        if count == 0:
            self._event(
                {
                    "type": "error",
                    "message": "В этом видео не удалось распознать речь. Возможно, в нем отсутствует аудиодорожка.",
                }
            )
            return

        self._event(
            {
                "type": "done",
                "language": info.language,
                "duration": round(info.duration, 2),
            }
        )

    def _event(self, payload: dict) -> None:
        body = f"data: {json.dumps(payload, ensure_ascii=False)}\n\n".encode("utf-8")
        chunk = f"{len(body):X}\r\n".encode("ascii") + body + b"\r\n"
        self.wfile.write(chunk)
        self.wfile.flush()

    def _finish(self) -> None:
        if getattr(self, "_finished", False):
            return
        self._finished = True
        self.wfile.write(b"0\r\n\r\n")
        self.wfile.flush()

    def _html(self) -> None:
        body = """<!doctype html>
<meta charset="utf-8">
<title>Расшифровка SummaVideo</title>
<body style="font-family:Segoe UI,sans-serif;max-width:36rem;margin:4rem auto;line-height:1.5">
<h1>Расшифровка запущена</h1>
<p>Это служебная программа на компьютере. Саму страницу сайта открывайте здесь:</p>
<p><a href="http://localhost:3000">http://localhost:3000</a></p>
<p>Дальше: «Видео с компьютера» → «Расшифровать полностью».</p>
</body>""".encode("utf-8")
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Filename")

    def log_message(self, format: str, *args) -> None:
        print(f"{self.address_string()} {format % args}")


def get_model():
    global model
    with model_lock:
        if model is None:
            from faster_whisper import WhisperModel

            model = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8")
        return model


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    server = ThreadingHTTPServer((HOST, PORT), TranscribeHandler)
    print(f"Расшифровка слушает http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
