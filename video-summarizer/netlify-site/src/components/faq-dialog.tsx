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
    answer: "Публичная версия принимает ссылку YouTube: youtube.com/watch?v=... или youtu.be/...",
  },
  {
    question: "Сохраняется ли ролик?",
    answer:
      "Нет. Ссылка уходит на сервер, чтобы получить расшифровку и собрать выжимку. Сам ролик не хранится. В браузере остаются три последние карточки.",
  },
  {
    question: "Это уже готовый анализ?",
    answer: "Да. По ссылке YouTube собирается краткая выжимка: тезисы и главы с таймкодами.",
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
