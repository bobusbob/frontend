@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Сначала создайте окружение и установите faster-whisper. Смотрите README в папке convert Video.
  exit /b 1
)
".venv\Scripts\python.exe" "server.py"
