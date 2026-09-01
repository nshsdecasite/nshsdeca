import Link from "next/link";
import { DecaButton } from "@/components/deca/button";
import { Rail } from "@/components/deca/rail";
import {
  accuracyTone,
  PLACEHOLDER_ACCURACY,
  PLACEHOLDER_SESSIONS,
  PLACEHOLDER_WAITING,
  PLACEHOLDER_WEAK_PIS,
} from "@/lib/deca/placeholder";
import { cn } from "@/lib/utils";

export type DashboardAccuracy = {
  name: string;
  accuracy: number;
};

export type DashboardSession = {
  name: string;
  kind: string;
  date: string;
  score: string;
  gold?: boolean;
  href?: string;
};

export type DashboardWeakPi = {
  code: string;
  text: string;
  meta: string;
  href?: string;
};

export type DashboardWaiting = {
  name: string;
  status: string;
  live?: boolean;
};

export function DashboardScreen({
  name,
  eventLabel = "Marketing Communications Series",
  points,
  testsTaken,
  roleplaysGraded,
  streak,
  questionCount,
  accuracy,
  sessions,
  weakPis,
  waiting,
  standingRank,
  standingOf,
  standingNote,
}: {
  name: string;
  eventLabel?: string;
  points: number;
  testsTaken: number;
  roleplaysGraded: number;
  streak: number;
  questionCount?: number;
  accuracy: DashboardAccuracy[];
  sessions: DashboardSession[];
  weakPis: DashboardWeakPi[];
  waiting: DashboardWaiting[];
  standingRank?: number | null;
  standingOf?: number | null;
  standingNote?: string;
}) {
  const accuracyRows = accuracy.length ? accuracy : PLACEHOLDER_ACCURACY;
  const sessionRows = sessions.length ? sessions : PLACEHOLDER_SESSIONS;
  const weakRows = weakPis.length ? weakPis : PLACEHOLDER_WEAK_PIS;
  const waitingRows = waiting.length ? waiting : PLACEHOLDER_WAITING;
  const rank = standingRank ?? 4;
  const of = standingOf ?? 148;

  return (
    <div>
      <div className="flex items-end justify-between gap-8 border-b border-edge px-11 pb-8 pt-10">
        <div>
          <p className="eyebrow">{eventLabel}</p>
          <h1 className="mt-3.5 font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] text-ink">
            {name}
          </h1>
        </div>
        <div className="flex gap-3">
          <DecaButton href="/tests">Start a test</DecaButton>
          <DecaButton href="/roleplays/submit" variant="outline">
            Submit a roleplay
          </DecaButton>
        </div>
      </div>

      <div className="grid grid-cols-4 border-b border-edge">
        <Stat value={String(points)} label="Chapter points" gold />
        <Stat value={String(testsTaken)} label="Tests taken" />
        <Stat value={String(roleplaysGraded)} label="Roleplays graded" />
        <Stat value={String(streak)} label="Day streak" last />
      </div>

      <div className="grid grid-cols-[1.5fr_1fr]">
        <div className="border-r border-edge">
          <div className="border-b border-edge px-11 py-9">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-extrabold tracking-[-0.025em] text-ink">
                Accuracy by instructional area
              </h2>
              <span className="font-mono text-xs tabular text-mute">
                {questionCount ?? 412} QUESTIONS
              </span>
            </div>
            <div className="mt-7 flex flex-col gap-5">
              {accuracyRows.map((row, index) => {
                const tone = accuracyTone(row.accuracy);
                return (
                  <div key={row.name}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[15px] text-ink">{row.name}</span>
                      <span
                        className={cn(
                          "font-mono text-[15px] font-medium tabular",
                          tone === "ever-dim" ? "text-mute" : "text-ink",
                        )}
                      >
                        {row.accuracy}%
                      </span>
                    </div>
                    <Rail
                      fill={row.accuracy / 100}
                      tone={tone}
                      delay={index * 60}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-11 py-9">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-extrabold tracking-[-0.025em] text-ink">
                Recent sessions
              </h2>
              <Link href="/tests/history" className="text-sm text-ink-2 hover:text-ink">
                All history
              </Link>
            </div>
            <div className="flex flex-col">
              {sessionRows.map((session, index) => (
                <Link
                  key={`${session.name}-${session.date}`}
                  href={session.href ?? "/tests/history"}
                  className={cn(
                    "grid grid-cols-[1fr_116px_84px_88px] items-center gap-4 py-4 text-ink hover:text-ink",
                    index < sessionRows.length - 1 && "border-b border-hair",
                  )}
                >
                  <span className="text-[15px]">{session.name}</span>
                  <span className="text-sm text-mute">{session.kind}</span>
                  <span className="font-mono text-[13px] tabular text-mute">
                    {session.date}
                  </span>
                  <span
                    className={cn(
                      "text-right font-mono text-[15px] font-medium tabular",
                      session.gold ? "text-gold" : "text-ink",
                    )}
                  >
                    {session.score}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="border-b border-edge px-8 py-9">
            <h2 className="mb-1 font-display text-[22px] font-extrabold tracking-[-0.025em] text-ink">
              Work on these next
            </h2>
            <p className="mb-5 text-sm text-ink-2">
              Indicators under 70% accuracy.
            </p>
            <div className="flex flex-col">
              {weakRows.map((pi, index) => (
                <Link
                  key={pi.code}
                  href={pi.href ?? "/tests/pi-targeted"}
                  className={cn(
                    "text-ink hover:text-ink",
                    index === 0 && "border-b border-hair pb-4",
                    index > 0 && index < weakRows.length - 1 && "border-b border-hair py-4",
                    index === weakRows.length - 1 && index > 0 && "pt-4",
                  )}
                >
                  <span className="font-mono text-[13px] font-semibold text-ever">
                    {pi.code}
                  </span>
                  <p className="mt-1.5 text-sm leading-[1.55] text-ink">{pi.text}</p>
                  <p className="mt-1.5 font-mono text-xs tabular text-mute">
                    {pi.meta}
                  </p>
                </Link>
              ))}
            </div>
            <DecaButton href="/tests/pi-targeted" className="mt-5 w-full">
              Build a test from these
            </DecaButton>
          </div>

          <div className="border-b border-edge px-8 py-9">
            <h2 className="mb-[18px] font-display text-[22px] font-extrabold tracking-[-0.025em] text-ink">
              Waiting on an officer
            </h2>
            <div className="flex flex-col gap-3.5">
              {waitingRows.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-[15px] text-ink">{item.name}</span>
                  <span
                    className={cn(
                      "font-mono text-xs uppercase tracking-[0.08em]",
                      item.live ? "text-gold" : "text-mute",
                    )}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gold-lt px-8 py-9">
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-gold">
              Chapter standing
            </p>
            <p className="mt-4 font-display text-[44px] font-extrabold leading-none tracking-[-0.035em] text-ink">
              {ordinal(rank)}{" "}
              <span className="text-[17px] font-semibold text-ink-2">of {of}</span>
            </p>
            <p className="mt-3.5 text-sm leading-[1.6] text-ink-2">
              {standingNote ??
                "35 points behind third. A graded roleplay is worth 15."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  gold,
  last,
}: {
  value: string;
  label: string;
  gold?: boolean;
  last?: boolean;
}) {
  return (
    <div className={cn("px-7 py-6", !last && "border-r border-hair")}>
      <p
        className={cn(
          "m-0 font-mono text-[32px] font-semibold leading-none tabular",
          gold ? "text-gold" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-mute">
        {label}
      </p>
    </div>
  );
}

function ordinal(n: number) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
