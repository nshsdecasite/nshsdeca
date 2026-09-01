import { DecaButton } from "@/components/deca/button";
import { Rail } from "@/components/deca/rail";
import { SiteNav } from "@/components/deca/site-nav";
import {
  PLACEHOLDER_EVENTS,
  PLACEHOLDER_FEATURES,
  PLACEHOLDER_SEASON,
} from "@/lib/deca/placeholder";

export function HomeScreen() {
  return (
    <>
      <SiteNav active="chapter" />

      <div className="grid animate-settle grid-cols-[1.55fr_1fr]">
        <div className="border-r border-edge px-14 pb-16 pt-20">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-mute">
            Newman Smith High School · Carrollton, TX · District 6
          </p>
          <h1 className="mt-6 max-w-[13ch] font-display text-[76px] font-extrabold leading-[0.96] tracking-[-0.035em] text-ink">
            Practice the event, not just the test.
          </h1>
          <p className="mt-6 max-w-[46ch] text-lg leading-[1.65] text-ink-2">
            Record a roleplay, submit it, and an officer sends back a rubric with
            comments pinned to the second they happened. Exams and study tools sit
            in the same account.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <DecaButton href="/signup" size="lg">
              Create an account
            </DecaButton>
            <DecaButton href="/#coming-up" variant="underline">
              See the chapter
            </DecaButton>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="border-b border-edge px-10 py-9">
            <p className="eyebrow mb-5">2025 season</p>
            <div className="flex flex-col gap-5">
              {PLACEHOLDER_SEASON.map((row, index) => (
                <div key={row.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[15px] text-ink">{row.label}</span>
                    <span
                      className={`font-mono text-xl font-semibold tabular ${row.goldCount ? "text-gold" : "text-ink"}`}
                    >
                      {row.count}
                    </span>
                  </div>
                  <Rail fill={row.fill} tone={row.tone} delay={index * 100} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-center bg-ever-lt px-10 py-9">
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-ever">
              In the library right now
            </p>
            <p className="mt-4 font-display text-[52px] font-extrabold leading-none tracking-[-0.035em] text-ink">
              1,284
            </p>
            <p className="mt-2.5 text-[15px] leading-[1.6] text-ink-2">
              released roleplay scenarios, every event, 2017 through 2026.
            </p>
          </div>
        </div>
      </div>

      <div
        id="compete"
        className="grid grid-cols-4 border-t border-edge"
      >
        {PLACEHOLDER_FEATURES.map((feature, index) => (
          <a
            key={feature.title}
            href={feature.href}
            className={`px-8 py-9 text-ink transition-colors duration-150 hover:bg-ever-lt hover:text-ink ${index < PLACEHOLDER_FEATURES.length - 1 ? "border-r border-edge" : ""}`}
          >
            <h3 className="mb-2.5 font-display text-[21px] font-semibold tracking-[-0.02em]">
              {feature.title}
            </h3>
            <p className="m-0 text-sm leading-[1.65] text-ink-2">{feature.body}</p>
          </a>
        ))}
      </div>

      <div
        id="coming-up"
        className="grid grid-cols-[1.4fr_1fr] border-t border-edge"
      >
        <div className="border-r border-edge px-14 py-12">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-display text-[30px] font-extrabold tracking-[-0.03em] text-ink">
              Coming up
            </h2>
            <a href="#coming-up" className="text-sm text-ink-2 hover:text-ink">
              Full calendar
            </a>
          </div>
          <div className="flex flex-col">
            {PLACEHOLDER_EVENTS.map((event, index) => (
              <div
                key={event.date}
                className={`grid grid-cols-[104px_1fr] items-baseline gap-7 py-6 ${index < PLACEHOLDER_EVENTS.length - 1 ? "border-b border-hair" : ""}`}
              >
                <span className="font-mono text-sm font-medium tabular text-gold">
                  {event.date}
                </span>
                <div>
                  <p className="m-0 font-display text-[19px] font-semibold tracking-[-0.015em] text-ink">
                    {event.name}
                  </p>
                  <p className="mt-1.5 text-[15px] leading-[1.6] text-ink-2">
                    {event.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-10 bg-ever-dk px-12 py-12 text-white">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-gold-br">
              Members
            </p>
            <h2 className="mt-5 max-w-[14ch] font-display text-[40px] font-extrabold leading-[1.02] tracking-[-0.03em] text-white">
              Sign in and pick up where you left off
            </h2>
            <p className="mt-[18px] max-w-[36ch] text-base leading-[1.65] text-white/78">
              Scores, notes, and every piece of feedback stay with your account all
              four years.
            </p>
          </div>
          <div className="flex gap-3">
            <DecaButton href="/login" variant="white">
              Member sign in
            </DecaButton>
            <DecaButton href="/login?next=/admin/grading" variant="ghost">
              Officer sign in
            </DecaButton>
          </div>
        </div>
      </div>
    </>
  );
}
