# SummaVideo

Сервис делает краткую выжимку ролика YouTube: транскрипт берётся в Supadata, текст собирает Gemini.

## Запуск

```bash
cd frontend
npm install
```

Скопируйте `.env.example` в `.env.local` и впишите ключи `SUPADATA_API_KEY` и `GEMINI_API_KEY`.

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Файл с компьютера

Полная расшифровка считается локально и не уходит в облако. В отдельном окне терминала:

```bash
cd ../transcribe
start.bat
```

На Windows, если окружения ещё нет, его создают один раз командами из `transcribe/requirements.txt` через Python 3.12 и пакет `faster-whisper`. После запуска `start.bat` на сайте выбирают «Видео с компьютера» и нажимают «Расшифровать полностью». Готовый текст скачивается в Word.

