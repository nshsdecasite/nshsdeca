import Link from "next/link";

const METHODS = [
  {
    href: "/study/pis",
    title: "Performance indicators",
    description: "Read the indicators for your event.",
  },
  {
    href: "/study/flashcards",
    title: "PI flashcards",
    description: "Flip indicators, grouped by instructional area.",
  },
  {
    href: "/study/vocab",
    title: "Vocab",
    description: "Terms and definitions by cluster.",
  },
  {
    href: "/study/theories",
    title: "Theories",
    description: "Frameworks and fallacies, with examples.",
  },
  {
    href: "/study/visuals",
    title: "Visuals",
    description: "Charts and matrices for roleplays and exams.",
  },
  {
    href: "/notes",
    title: "Notes",
    description: "Your own notebooks.",
  },
] as const;

export function StudyHubScreen() {
  return (
    <div>
      <h1 className="font-display text-[40px] font-black tracking-[-0.04em] text-balance">
        Study
      </h1>
      <p className="mt-2.5 max-w-md text-sm text-pretty text-ink-2">
        Pick a method and start.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {METHODS.map((method) => (
          <Link
            key={method.href}
            href={method.href}
            className="deca-card flex items-center justify-between gap-4 px-7 py-6 text-ink transition-[background-color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-ever-lt"
          >
            <span>
              <span className="block font-display text-[22px] font-extrabold tracking-[-0.02em] text-balance">
                {method.title}
              </span>
              <span className="mt-1.5 block text-sm leading-[1.5] text-pretty text-ink-2">
                {method.description}
              </span>
            </span>
            <span className="shrink-0 text-[13px] font-bold text-ever-dk">Open</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
