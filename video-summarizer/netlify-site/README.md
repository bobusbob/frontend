# SummaVideo для Netlify

Эта папка — публикация сайта, который делает выжимку **по ссылке YouTube**.

Расшифровку берёт [Supadata](https://supadata.ai), текст собирает Gemini (`gemini-4-hydrogen`). Файл с компьютера здесь не обрабатывается: локальная расшифровка остаётся в папке `convert Video` и `transcribe`.

## Почему не Netlify Drop

Перетаскивание папки на [Netlify Drop](https://app.netlify.com/drop) публикует только готовые файлы. Drop не ставит пакеты, не собирает Next.js и не запускает функции. Ключи API в такую папку класть нельзя: они стали бы видны в браузере, а оба запроса всё равно не выполнились бы.

Чтобы заработали Supadata и Gemini, сайт нужно **собрать** на Netlify. Сборка сама подключает функции.

Обычный запрос на Netlify обрывается через 60 секунд. Транскрипт Supadata иногда готовится дольше, затем ещё отвечает Gemini. Поэтому длинная работа идёт в фоновой функции `summarize-background` (до 15 минут). Страница создаёт задачу и опрашивает её статус. Результат лежит в Netlify Blobs и не пишется в базу.

## Публикация из GitHub

1. Netlify → **Add new site** → **Import an existing project** → репозиторий `frontend`.
2. **Base directory:** `video-summarizer/netlify-site`
3. **Build command:** `npm run build` (уже указан в `netlify.toml`).
4. **Site configuration → Environment variables**, добавить:
   - `SUPADATA_API_KEY`
   - `GEMINI_API_KEY`
5. Запустить деплой.

Ключи задаются только в интерфейсе Netlify. В эту папку и в git их не кладут.

## Публикация из этой папки через CLI

Если репозиторий подключать не хочется, из этой папки:

```bash
npm install
npx netlify login
npx netlify init
npx netlify deploy --build --prod
```

Перед `deploy` те же две переменные нужно задать в настройках созданного сайта. Команда `netlify deploy --build` как раз собирает сайт и функции. Простое перетаскивание папки этого не делает.

## Проверка на своём компьютере

```bash
cd "video-summarizer/netlify-site"
npm install
```

Скопируйте `.env.example` в `.env.local` и впишите оба ключа.

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000), вставьте ссылку YouTube и нажмите «Создать краткое содержание». Локально задача считается в том же процессе. На Netlify её считает фоновая функция.

## Что уходит по сети

На сервер уходит только ссылка. Ролик не скачивается и не хранится. В браузере остаются три последние карточки.

С этого компьютера Gemini отвечает «User location is not supported»: регион запроса ему не подходит. Сборка на Netlify выполняет тот же вызов уже с сервера Netlify. Supadata при проверке ссылки отвечает успешно.
