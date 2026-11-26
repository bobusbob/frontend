export function Footer({ onOpenFaq }: { onOpenFaq: () => void }) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-4 py-6 text-sm text-faint sm:flex-row sm:items-center sm:px-6">
        <p>© 2026 SummaVideo. Конфиденциально. Файлы не сохраняются.</p>
        <button
          type="button"
          onClick={onOpenFaq}
          className="cursor-pointer text-secondary underline-offset-4 hover:text-ink hover:underline"
        >
          Вопросы
        </button>
      </div>
    </footer>
  );
}
