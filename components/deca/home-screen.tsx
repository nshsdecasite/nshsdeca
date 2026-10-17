import Image from "next/image";
import { DecaButton } from "@/components/deca/button";
import { SiteNav } from "@/components/deca/site-nav";
import { formatStat, type SiteStats } from "@/lib/site-stats";

const STEPS = [
  {
    step: "STEP 1",
    title: "Pick a scenario",
    body: "Released roleplays by event, year, and level.",
  },
  {
    step: "STEP 2",
    title: "Record and submit",
    body: "Upload your run. It goes straight to an officer.",
  },
  {
    step: "STEP 3",
    title: "Get your score back",
    body: "Official rubric scoring plus what to fix next.",
  },
];

type HomeScreenProps = {
  stats: SiteStats;
};

export function HomeScreen({ stats }: HomeScreenProps) {
  const statCards = [
    { value: formatStat(stats.scenarios), label: "Roleplay scenarios" },
    { value: formatStat(stats.examQuestions), label: "Exam questions" },
    { value: formatStat(stats.competitiveEvents), label: "Competitive events" },
    {
      value: formatStat(stats.performanceIndicators),
      label: "Performance indicators",
      dark: true,
    },
  ];

  return (
    <>
      <SiteNav
        active="program"
        logoClassName="no-outline h-9 w-auto sm:h-12 md:h-[3.4rem]"
      />

      <div className="grid animate-settle grid-cols-1 items-stretch gap-3 px-4 pt-2 sm:gap-4 sm:px-8 sm:pt-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:px-10">
        <div className="deca-card flex flex-col items-start px-6 py-8 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
          <h1 className="max-w-[12ch] text-balance font-display text-[2.5rem] font-black leading-[0.95] tracking-[-0.045em] text-ink sm:text-6xl lg:text-[72px]">
            Roleplay practice for Newman Smith DECA.
          </h1>
          <p className="mt-4 max-w-[42ch] text-pretty text-base leading-[1.55] text-ink-2 sm:mt-6 sm:text-lg">
            {formatStat(stats.scenarios)} scenarios, {stats.exams} exams, and officer
            grading on the official rubric.
          </p>
          <div className="mt-auto flex flex-wrap gap-3 pt-8 sm:pt-10">
            <DecaButton href="/login?next=/roleplays" size="lg">
              Sign in
            </DecaButton>
            <DecaButton href="/login?next=/roleplays" variant="tint" size="lg">
              Browse scenarios
            </DecaButton>
          </div>
        </div>
        <div className="relative min-h-[220px] overflow-hidden rounded-[20px] bg-[#e3e1d6] shadow-card sm:min-h-[320px] lg:min-h-[520px]">
          <Image
            src="/images/chapter-hero.webp"
            alt="Newman Smith DECA chapter"
            fill
            priority
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="no-outline object-cover grayscale"
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 px-4 sm:mt-4 sm:gap-4 sm:px-8 lg:grid-cols-4 lg:px-10">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={
              stat.dark
                ? "rounded-[20px] bg-ever-dk px-4 py-5 text-white sm:px-7 sm:py-[26px]"
                : "deca-card px-4 py-5 sm:px-7 sm:py-[26px]"
            }
          >
            <p className="font-display text-[32px] font-black tracking-[-0.035em] tabular-nums sm:text-[42px]">
              {stat.value}
            </p>
            <p
              className={
                stat.dark
                  ? "mt-1.5 text-[13px] font-semibold text-white/92"
                  : "mt-1.5 text-[13px] font-semibold text-mute"
              }
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 px-4 sm:mt-4 sm:gap-4 sm:px-8 md:grid-cols-3 lg:px-10">
        {STEPS.map((step) => (
          <div key={step.step} className="deca-card px-5 py-5 sm:px-7 sm:py-[26px]">
            <span className="rounded-full bg-ever-lt px-3 py-1 text-xs font-extrabold text-ever-dk">
              {step.step}
            </span>
            <h3 className="mt-3.5 font-display text-[21px] font-extrabold tracking-[-0.02em]">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-[1.55] text-ink-2">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="px-5 py-8 text-center text-xs font-semibold uppercase tracking-[0.06em] text-pretty text-mute sm:px-8 sm:py-10 lg:px-10">
        Newman Smith High School DECA · Carrollton, TX
      </div>
    </>
  );
}
