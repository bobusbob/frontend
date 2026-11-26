# Active Context

## Current Task
Task: Папка публикации YouTube-сайта на Netlify
Folder: video-summarizer/netlify-site/

## Task Files
- video-summarizer/netlify-site/README.md — как публиковать, чтобы заработали оба API
- video-summarizer/netlify-site/netlify.toml — сборка Next.js и фоновая функция
- video-summarizer/netlify-site/netlify/functions/summarize-background.ts — Supadata и Gemini
- video-summarizer/.mem/progress.md ★
- video-summarizer/.mem/decisions.md ★

## Focus
- Папка `video-summarizer/netlify-site` собрана только под ссылку YouTube
- Длинный запрос идёт фоновой функцией, страница опрашивает статус
- Ключи задаются в интерфейсе Netlify, в папку их не класть

## Blockers
- С этого компьютера Gemini отвечает, что регион не поддерживается. Supadata по ссылке отвечает.
- Netlify Drop не запускает функции: нужна сборка через Git или `netlify deploy --build`

## Agent Context
- Фоновая функция `summarize-background`
- Хранилище задач: Netlify Blobs `jobs`, локально — память процесса
- Маршруты `/api/jobs` и `/api/jobs/[id]`
- Локальный проект `convert Video` и `transcribe` не трогались
