import Link from "next/link";
import { cn } from "@/lib/utils";

type StudyLink = {
  href: string;
  title: string;
  description: string;
  locked?: boolean;
  badge?: string;
};

function StudyCard({ item }: { item: StudyLink }) {
  const body = (
    <>
      <span>
        <span className="flex flex-wrap items-center gap-2">
          <span className="block font-display text-[22px] font-extrabold tracking-[-0.02em] text-balance">
            {item.title}
          </span>
          {item.badge ? (
            <span className="rounded-full bg-ever-lt px-3 py-1 text-[11px] font-extrabold text-ever-dk">
              {item.badge}
            </span>
          ) : null}
        </span>
        <span className="mt-1.5 block text-sm leading-[1.5] text-pretty text-ink-2">
          {item.description}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 text-[13px] font-bold",
          item.locked ? "text-mute" : "text-ever-dk",
        )}
      >
        {item.locked ? "Locked" : "Open"}
      </span>
    </>
  );

  const className =
    "deca-card flex items-center justify-between gap-4 px-7 py-6 text-ink transition-[background-color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)]";

  if (item.locked) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Link href={item.href} className={cn(className, "hover:bg-ever-lt")}>
      {body}
    </Link>
  );
}

export function StudyHubScreen({ examsLocked }: { examsLocked: boolean }) {
  const sections: { title: string; items: StudyLink[] }[] = [
    {
      title: "Exams",
      items: [
        {
          href: "/tests/full",
          title: "Full practice test",
          description: "Work through an official cluster exam.",
          badge: examsLocked ? "Assigned · Timed" : undefined,
        },
        {
          href: "/tests/custom",
          title: "Custom test",
          description: "Choose the topics and the number of questions.",
          locked: examsLocked,
        },
        {
          href: "/tests/pi-targeted",
          title: "PI-targeted test",
          description: "Practice the indicators you miss most.",
          locked: examsLocked,
        },
        {
          href: "/tests/history",
          title: "Test history",
          description: "Review scores and answers from past tests.",
        },
      ],
    },
    {
      title: "PIs",
      items: [
        {
          href: "/study/pis",
          title: "Performance indicators",
          description: "Read the indicators for your event.",
        },
        {
          href: "/study/flashcards",
          title: "PI flashcards",
          description: "Flip the indicators for your competitive event.",
        },
      ],
    },
    {
      title: "Misc",
      items: [
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
      ],
    },
  ];

  return (
    <div>
      <h1 className="font-display text-[40px] font-black tracking-[-0.04em] text-balance">
        Study
      </h1>
      <p className="mt-2.5 max-w-md text-sm text-pretty text-ink-2">Pick a method and start.</p>

      <div className="mt-10 space-y-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-balance">
              {section.title}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {section.items.map((item) => (
                <StudyCard key={item.href} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
