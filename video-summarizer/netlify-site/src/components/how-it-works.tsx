const STEPS = [
  {
    index: "01",
    title: "Источник",
    text: "Вставьте ссылку на лекцию, вебинар или интервью на YouTube.",
  },
  {
    index: "02",
    title: "Аналитика",
    text: "Алгоритм переводит речь в текст и убирает повторы, паузы и воду.",
  },
  {
    index: "03",
    title: "Результат",
    text: "Вы получаете тезисы, главы с таймкодами и забираете текст с собой.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto mt-16 w-full max-w-4xl pb-4 sm:mt-24">
      <h2 className="text-center text-xl font-medium tracking-tight text-ink sm:text-2xl">
        Как это работает
      </h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {STEPS.map((step) => (
          <article
            key={step.index}
            className="rounded-2xl border border-line bg-surface p-5 transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:border-line-strong"
          >
            <p className="font-mono text-xs font-medium text-accent">{step.index}</p>
            <h3 className="mt-3 text-base font-medium text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary">{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
