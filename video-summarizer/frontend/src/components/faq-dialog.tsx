"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

const QUESTIONS = [
  {
    question: "Нужна ли регистрация?",
    answer: "Нет. Сервис открывается сразу, без аккаунта и лишних полей.",
  },
  {
    question: "Какие видео можно передать?",
    answer:
      "Ссылку YouTube — youtube.com/watch, youtu.be или Shorts — либо файл MP4, MOV, WebM, MKV до 500 МБ.",
  },
  {
    question: "Сохраняются ли файлы?",
    answer:
      "В этой версии файл остаётся на устройстве и не загружается. В браузере хранятся только три последние карточки.",
  },
  {
    question: "Это уже готовый анализ?",
    answer:
      "Пока это интерфейс. Шаги и карточка показывают, как сервис будет выглядеть. Распознавание речи подключим отдельно.",
  },
  {
    question: "Что будет в выжимке?",
    answer:
      "Короткий список главных мыслей, главы с таймкодами, копирование всего текста и скачивание Markdown.",
  },
];

export function FaqDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="faq-dialog"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-medium tracking-tight text-ink">
              О проекте
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              SummaVideo делает короткую выжимку из ролика: тезисы, главы и таймкоды.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-secondary hover:bg-elevated hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <dl className="mt-6 space-y-5">
          {QUESTIONS.map((item) => (
            <div key={item.question}>
              <dt className="text-sm font-medium text-ink">{item.question}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-secondary">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </dialog>
  );
}
