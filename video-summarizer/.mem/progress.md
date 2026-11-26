# Progress: Веб-сервис суммаризации видео

## Status
В работе

## Done
- [x] Анализ требований к минималистичному веб-сервису (YouTube + локальные файлы)
- [x] Разработка концепции UI/UX (Single-Screen Utility, Vercel/Linear эстетика)
- [x] Формирование детального PRD спецификации дизайна и интерфейса
- [x] Описание цветовой палитры, типографики, компонентов, состояний и анимаций
- [x] Фронтенд Next.js: хедер, два режима ввода, шаги ожидания, карточка выжимки, FAQ, история в браузере, светлая и тёмная темы
- [x] Проверка сценария в браузере: неверная ссылка, превью YouTube, демо-результат, файл, тема, вопросы, узкий экран

- [x] Реализован бэкенд: Supadata (транскрипт кусками и метаданные), Gemini, поток `/api/summarize`
- [x] Демо в `createSummary` заменено на чтение этого потока

- [x] Локальная расшифровка файла: faster-whisper на 127.0.0.1:8765, полный текст и Word
- [x] Отдельная папка `video-summarizer/netlify-site`: только YouTube, Supadata и Gemini через фоновую функцию

## Remaining
- [ ] Опубликовать `video-summarizer/netlify-site` сборкой Netlify и задать в сайте `SUPADATA_API_KEY` и `GEMINI_API_KEY`
- [ ] Прогнать живой ролик уже с сервера Netlify: с этого компьютера Gemini отклоняет регион

## Notes
- Публикация: `video-summarizer/netlify-site`. Drop папки не запускает Supadata и Gemini
- Локальный проект: `cd "video-summarizer/convert Video" && npm run dev`
- Ключи локально: `convert Video/.env.local` и копия в `netlify-site/.env.local` (файл в gitignore)
- В `localStorage` хранятся только три последние карточки
- Шрифты: Inter и JetBrains Mono, потому что в них есть кириллица
