import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DecaButton } from "@/components/deca/button";
import { Rail } from "@/components/deca/rail";
import { accuracyTone, NEXT_CONFERENCE } from "@/lib/deca/placeholder";
import { weeksUntil } from "@/lib/deca/format";
import { cn } from "@/lib/utils";

export type DashboardAccuracy = {
  name: string;
  accuracy: number;
};

export type DashboardTrendPoint = {
  label: string;
  score: number;
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

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function DashboardScreen({
  name,
  examAccuracy,
  roleplayAverage,
  streak,
  piCoveragePct,
  eventPisStudied,
  eventPiTotal,
  questionCount,
  accuracy,
  trend,
  weakPis,
  waiting,
}: {
  name: string;
  examAccuracy: number | null;
  roleplayAverage: number | null;
  roleplayAttempts?: number;
  streak: number;
  bestStreak?: number;
  piCoveragePct: number | null;
  eventPisStudied?: number;
  eventPiTotal?: number;
  questionCount?: number;
  accuracy: DashboardAccuracy[];
  trend: DashboardTrendPoint[];
  weakPis: DashboardWeakPi[];
  waiting: DashboardWaiting[];
  testsTaken?: number;
  roleplaysGraded?: number;
}) {
  const firstName = name.split(" ")[0] || name;
  const weeks = weeksUntil(NEXT_CONFERENCE.iso);

  const jumps = [
    {
      href: "/tests",
      title: "Practice exam",
      detail:
        examAccuracy != null ? `${examAccuracy}% test accuracy` : "Start a full or custom test",
    },
    {
      href: "/roleplays",
      title: "Roleplays",
      detail:
        roleplayAverage != null
          ? `${roleplayAverage}% roleplay accuracy`
          : "Browse scenarios and submit",
    },
    {
      href: weakPis[0]?.href ?? "/study/pis",
      title: "Study",
      detail:
        eventPiTotal
          ? `${eventPisStudied ?? 0}/${eventPiTotal} event PIs studied`
          : weakPis.length > 0
            ? `${weakPis.length} weak indicator${weakPis.length === 1 ? "" : "s"}`
            : "PIs, flashcards, and vocab",
    },
    {
      href: "/messages",
      title: "Messages",
      detail: "Announcements and DMs",
    },
  ];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold tracking-[0.1em] uppercase text-ever-dk">
            {todayLabel()}
          </p>
          <h1 className="mt-2 text-balance font-display text-[32px] font-black tracking-[-0.04em] sm:text-[40px]">
            {timeGreeting()}, {firstName}
          </h1>
          {weeks > 0 ? (
            <p className="mt-2 text-sm text-ink-2">
              {weeks} weeks to {NEXT_CONFERENCE.name}.
            </p>
          ) : null}
        </div>
        <div className="flex gap-2.5">
          <DecaButton href="/tests" variant="outline">
            Practice exam
          </DecaButton>
          <DecaButton href="/roleplays">New roleplay</DecaButton>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Test accuracy"
          value={examAccuracy != null ? `${examAccuracy}%` : "—"}
        />
        <StatCard
          label="Roleplay accuracy"
          value={roleplayAverage != null ? `${roleplayAverage}%` : "—"}
        />
        <StatCard label="Streak" value={`${streak}d`} />
        <StatCard
          label="Performance indicators"
          value={piCoveragePct != null ? `${piCoveragePct}%` : "—"}
          note={
            eventPiTotal
              ? `${eventPisStudied ?? 0}/${eventPiTotal} for your event`
              : "Set your event in profile"
          }
          rail={piCoveragePct != null ? piCoveragePct / 100 : undefined}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="deca-card px-7 py-6">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
              Accuracy by area
            </h2>
            {questionCount ? (
              <span className="text-xs font-bold text-mute">{questionCount} Qs</span>
            ) : null}
          </div>
          {accuracy.length === 0 ? (
            <p className="text-sm text-ink-2">Complete a practice test to see this.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {accuracy.map((row, index) => (
                <div
                  key={row.name}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_40px] items-center gap-3"
                >
                  <span className="truncate text-[13px] font-semibold">{row.name}</span>
                  <Rail
                    fill={row.accuracy / 100}
                    tone={accuracyTone(row.accuracy)}
                    delay={index * 60}
                    height="h-3"
                    className="mt-0"
                  />
                  <span className="text-right text-[13px] font-bold tabular-nums">
                    {row.accuracy}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {trend.length > 0 ? (
            <div className="mt-7 border-t border-hair pt-5">
              <h3 className="mb-2 text-[13px] font-bold text-mute">Recent exams</h3>
              <ExamTrend points={trend} />
            </div>
          ) : null}
        </div>

        <div className="deca-card px-5 py-5">
          <h2 className="px-2 font-display text-[19px] font-extrabold tracking-[-0.02em]">
            Quick jump
          </h2>
          <div className="mt-3 flex flex-col">
            {jumps.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-[14px] px-2 py-3 text-ink hover:bg-ground hover:text-ink"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold">{item.title}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-mute">
                    {item.detail}
                  </span>
                </span>
                <ChevronRight
                  className="h-4 w-4 flex-none text-mute transition-transform duration-150 group-hover:translate-x-0.5"
                  strokeWidth={2.25}
                />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="deca-card px-6 py-5 lg:col-span-1">
          <h2 className="font-display text-[17px] font-extrabold tracking-[-0.02em]">
            Work on next
          </h2>
          {weakPis.length === 0 ? (
            <p className="mt-3 text-sm text-ink-2">No weak indicators yet.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2.5">
              {weakPis.map((pi) => (
                <Link
                  key={pi.code}
                  href={pi.href ?? "/tests/pi-targeted"}
                  className="flex items-start justify-between gap-2 text-ink hover:text-ink"
                >
                  <span className="text-[13px] leading-[1.4]">{pi.text}</span>
                  <span className="flex-none rounded-full bg-gold-lt px-2 py-[2px] text-[11px] font-extrabold text-gold">
                    {pi.meta.split(" · ")[0]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="deca-card px-6 py-5">
          <h2 className="font-display text-[17px] font-extrabold tracking-[-0.02em]">
            Waiting on grade
          </h2>
          {waiting.length === 0 ? (
            <p className="mt-3 text-sm text-ink-2">Nothing queued.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2.5">
              {waiting.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px]">{item.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-[2px] text-[11px] font-extrabold",
                      item.live ? "bg-ever-lt text-ever-dk" : "bg-ground text-mute",
                    )}
                  >
                    {item.live ? "IN REVIEW" : "QUEUED"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col rounded-[20px] bg-ever-dk px-6 py-5 text-white">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-white/80">
            Next up
          </p>
          <p className="mt-2 font-display text-[18px] font-extrabold leading-snug tracking-[-0.02em]">
            {NEXT_CONFERENCE.name}
          </p>
          <p className="mt-1.5 text-[13px] text-white/85">{NEXT_CONFERENCE.when}</p>
          <div className="mt-auto flex justify-end pt-4">
            <DecaButton href="/calendar" variant="white" size="sm">
              All events
            </DecaButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  note,
  rail,
}: {
  label: string;
  value: string;
  suffix?: string;
  note?: string;
  rail?: number;
}) {
  return (
    <div className="deca-card overflow-hidden">
      <div className="h-[3px] bg-ever" />
      <div className="px-5 py-4">
        <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-mute">{label}</p>
        <p className="mt-1.5 font-display text-[32px] font-black tracking-[-0.035em] tabular-nums">
          {value}
          {suffix ? <span className="text-base text-mute">{suffix}</span> : null}
        </p>
        {note ? <p className="mt-1.5 text-[11px] text-mute">{note}</p> : null}
        {rail != null ? <Rail fill={rail} height="h-[6px]" className="mt-3" /> : null}
      </div>
    </div>
  );
}

function ExamTrend({ points }: { points: DashboardTrendPoint[] }) {
  const width = 620;
  const height = 110;
  const pad = 10;
  const xs = points.map((_, i) =>
    points.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (points.length - 1),
  );
  const ys = points.map((point) => {
    const t = (100 - Math.max(0, Math.min(100, point.score))) / 100;
    return 16 + t * 72;
  });
  const line = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const area = `M${xs[0]},${ys[0]} ${xs
    .map((x, i) => `L${x},${ys[i]}`)
    .join(" ")} L${xs[xs.length - 1]},${height} L${xs[0]},${height} Z`;
  const last = points[points.length - 1];

  return (
    <>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-[110px] w-full overflow-visible"
        aria-label="Practice exam trend"
      >
        <defs>
          <linearGradient id="dash-trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7d9068" stopOpacity="0.22" />
            <stop offset="1" stopColor="#7d9068" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#dash-trend)" />
        <polyline
          points={line}
          fill="none"
          stroke="#7d9068"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={xs[xs.length - 1]}
          cy={ys[ys.length - 1]}
          r="5"
          fill="#47583c"
          stroke="#fff"
          strokeWidth="2"
        />
        <text
          x={xs[xs.length - 1]}
          y={Math.max(12, ys[ys.length - 1] - 12)}
          textAnchor="end"
          fontSize="12"
          fontWeight="800"
          fill="#2b2a25"
        >
          {last?.score ?? ""}
        </text>
      </svg>
      <div className="mt-1 flex justify-between text-[11px] font-bold text-mute">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </>
  );
}
