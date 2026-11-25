# Active Context

## Current Task
Task: План расшифровки файла с компьютера
Folder: video-summarizer/

## Task Files
- video-summarizer/BACKEND_PLAN.md — план YouTube: Supadata и Gemini
- video-summarizer/.mem/progress.md ★
- video-summarizer/.mem/decisions.md ★
- video-summarizer/frontend — экран, вкладка «Видео с компьютера» пока без анализа

## Focus
- Вкладка файла расшифровывает речь локально через faster-whisper
- Результат — полный текст и файл Word
- Сервер расшифровки: `transcribe/start.bat` на порту 8765

## Blockers
- YouTube по-прежнему упирается в лимит Supadata и региональный отказ Gemini

## Agent Context
- transcribe/server.py
- frontend/src/lib/transcribe.ts
- Модель small, CPU, int8
- PyAV зафиксирован ниже 15: иначе faster-whisper не открывает файл
