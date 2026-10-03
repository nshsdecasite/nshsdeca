import Link from "next/link";
import { DecaButton } from "@/components/deca/button";
import { Rail } from "@/components/deca/rail";
import { accuracyTone } from "@/lib/deca/placeholder";
import { platformSections } from "@/data/platform-features";

const LIVE_STUDY_ROUTES = new Set([
  "/study/pis",
  "/study/flashcards",
  "/study/vocab",
  "/study/visuals",
  "/study/theories",
  "/notes",
]);

export function StudyHubScreen({
  resumeHref,
  resumeTitle,
  resumeProgress,
  resumeMeta,
  dueCards,
  streak,
  weakestName,
  weakestAccuracy,
  decks,
}: {
  resumeHref?: string;
  resumeTitle?: string;
  resumeProgress?: number;
  resumeMeta?: string;
  dueCards: number;
  streak: number;
  weakestName?: string;
  weakestAccuracy?: number;
  decks: { id: string; title: string; count: number; mastered: number }[];
}) {
  const studySection = platformSections.find((section) => section.title === "Study tools");
  const examSection = platformSections.find((section) => section.title === "Practice tests");

  return (
    <div className="px-9 py-9">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-[40px] font-black tracking-[-0.04em]">Study</h1>
          <p className="mt-2.5 text-sm text-ink-2">
            Flashcards, indicator drills and full cluster exams.
          </p>
        </div>
        <DecaButton href={resumeHref ?? "/tests"}>
          Start today&apos;s session
        </DecaButton>
      </div>

      <div className="mt-[26px] grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="deca-card px-7 py-[26px]">
          <p className="text-xs font-extrabold tracking-[0.1em] uppercase text-ever-dk">
            Pick up where you left off
          </p>
          <h3 className="mt-3 font-display text-xl font-extrabold tracking-[-0.02em]">
            {resumeTitle ?? "Start a practice exam"}
          </h3>
          <p className="mt-1.5 text-[13px] text-mute">
            {resumeMeta ?? "Full cluster, custom, or PI-targeted"}
          </p>
          {resumeProgress != null ? (
            <Rail fill={resumeProgress} height="h-[9px]" className="mt-2" />
          ) : null}
          <DecaButton href={resumeHref ?? "/tests"} size="sm" className="mt-[18px]">
            {resumeHref ? "Resume" : "Open tests"}
          </DecaButton>
        </div>
        <div className="deca-card px-7 py-[26px]">
          <p className="text-xs font-extrabold tracking-[0.1em] uppercase text-ever-dk">
            Flashcards due today
          </p>
          <p className="mt-2.5 font-display text-[40px] font-black tracking-[-0.035em]">
            {dueCards}
            <span className="text-lg text-mute"> cards</span>
          </p>
          <p className="mt-1.5 text-[13px] text-mute">
            {streak}-day streak · about {Math.max(1, Math.round(dueCards / 3))} minutes
          </p>
          <DecaButton href="/study/flashcards" variant="tint" size="sm" className="mt-[18px]">
            Review now
          </DecaButton>
        </div>
        <div className="deca-card px-7 py-[26px]">
          <p className="text-xs font-extrabold tracking-[0.1em] uppercase text-gold">
            Weakest area
          </p>
          <h3 className="mt-3 font-display text-xl font-extrabold tracking-[-0.02em]">
            {weakestName ?? "No weak area yet"}
            {weakestAccuracy != null ? ` · ${weakestAccuracy}%` : ""}
          </h3>
          <p className="mt-1.5 text-[13px] text-mute">
            Drill the indicators that keep costing points.
          </p>
          <DecaButton href="/tests/pi-targeted" variant="tint" size="sm" className="mt-[18px]">
            Drill 15 questions
          </DecaButton>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="deca-card px-[30px] py-7">
          <div className="mb-[18px] flex items-baseline justify-between">
            <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
              Flashcard decks
            </h2>
            <span className="text-xs font-bold text-mute">mastered</span>
          </div>
          {decks.length === 0 ? (
            <p className="text-sm text-mute">No decks yet. Open flashcards to generate them.</p>
          ) : (
            <div className="flex flex-col gap-[18px]">
              {decks.slice(0, 4).map((deck) => {
                const pct = deck.count ? Math.round((deck.mastered / deck.count) * 100) : 0;
                return (
                  <Link key={deck.id} href={`/study/flashcards/${deck.id}`} className="text-ink hover:text-ink">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-semibold">
                        {deck.title}{" "}
                        <span className="text-xs font-semibold text-mute">
                          · {deck.count} cards
                        </span>
                      </span>
                      <span className="text-[13px] font-extrabold">{pct}%</span>
                    </div>
                    <Rail
                      fill={pct / 100}
                      tone={accuracyTone(pct)}
                      height="h-[9px]"
                      className="mt-2"
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="deca-card px-[30px] py-7">
          <h2 className="mb-[18px] font-display text-[19px] font-extrabold tracking-[-0.02em]">
            Full practice exams
          </h2>
          <div className="flex flex-col gap-3">
            {(examSection?.features ?? []).map((feature) => (
              <div
                key={feature.href}
                className="flex items-center justify-between gap-3 rounded-2xl bg-ground px-5 py-4"
              >
                <div>
                  <p className="m-0 text-sm font-bold">{feature.title}</p>
                  <p className="mt-1 text-xs text-mute">{feature.description}</p>
                </div>
                <DecaButton href={feature.href} variant="outline" size="sm" className="flex-none">
                  Open
                </DecaButton>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-mute">
            Scores post to your dashboard and the chapter leaderboard.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(studySection?.features ?? []).map((feature) => {
          const isLive = LIVE_STUDY_ROUTES.has(feature.href);
          return (
            <Link
              key={feature.href}
              href={isLive ? feature.href : "/study"}
              className="deca-card px-7 py-6 text-ink hover:text-ink"
            >
              <h3 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-[1.55] text-ink-2">{feature.description}</p>
              <span className="mt-4 inline-flex text-[13px] font-bold text-ever-dk">
                {isLive ? "Open" : "Coming soon"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
