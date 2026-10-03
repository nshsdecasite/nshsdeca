import Link from "next/link";
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

export function DashboardScreen({
  name,
  examAccuracy,
  roleplayAverage,
  roleplayAttempts,
  streak,
  bestStreak,
  masteredCount,
  masteredTotal,
  questionCount,
  accuracy,
  trend,
  weakPis,
  waiting,
  standingRank,
  standingOf,
  standingNote,
  points,
  testsTaken,
  roleplaysGraded,
}: {
  name: string;
  examAccuracy: number | null;
  roleplayAverage: number | null;
  roleplayAttempts: number;
  streak: number;
  bestStreak?: number;
  masteredCount: number;
  masteredTotal: number;
  questionCount?: number;
  accuracy: DashboardAccuracy[];
  trend: DashboardTrendPoint[];
  weakPis: DashboardWeakPi[];
  waiting: DashboardWaiting[];
  standingRank?: number | null;
  standingOf?: number | null;
  standingNote?: string;
  points?: number;
  testsTaken?: number;
  roleplaysGraded?: number;
}) {
  const weeks = weeksUntil(NEXT_CONFERENCE.iso);
  const masteredPct = masteredTotal
    ? Math.round((masteredCount / masteredTotal) * 100)
    : 0;

  return (
    <div className="px-9 py-9">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold tracking-[0.1em] uppercase text-ever-dk">
            {standingRank && standingOf
              ? `#${standingRank} of ${standingOf} · ${points ?? 0} points`
              : `${points ?? 0} chapter points`}
          </p>
          <h1 className="mt-2.5 font-display text-[40px] font-black tracking-[-0.04em]">
            {weeks > 0 ? `${weeks} weeks to district` : `Welcome back, ${name.split(" ")[0]}`}
          </h1>
          {standingNote ? (
            <p className="mt-2 text-sm text-ink-2">{standingNote}</p>
          ) : null}
        </div>
        <div className="flex gap-2.5">
          <DecaButton href="/tests" variant="outline">
            Practice exam
          </DecaButton>
          <DecaButton href="/roleplays">New roleplay</DecaButton>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Exam accuracy"
          value={examAccuracy != null ? String(examAccuracy) : "—"}
          suffix={examAccuracy != null ? "%" : undefined}
          note={questionCount ? `${questionCount} questions answered` : "Take a practice exam"}
        />
        <StatCard
          label="Roleplay average"
          value={roleplayAverage != null ? String(roleplayAverage) : "—"}
          suffix={roleplayAverage != null ? "/100" : undefined}
          note={
            roleplayAttempts
              ? `${roleplayAttempts} graded · ${roleplaysGraded ?? 0} total submitted`
              : "Submit a roleplay"
          }
        />
        <StatCard
          label="Study streak"
          value={String(streak)}
          suffix=" days"
          note={bestStreak ? `best: ${bestStreak} days` : "Practice today to start"}
        />
        <StatCard
          label="Tests completed"
          value={String(testsTaken ?? 0)}
          note={`${masteredCount} PIs at 70%+ accuracy`}
          rail={masteredPct / 100}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <div className="deca-card px-[30px] py-7">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
                Accuracy by instructional area
              </h2>
              <span className="text-xs font-bold text-mute">
                {questionCount ?? 0} questions
              </span>
            </div>
            {accuracy.length === 0 ? (
              <p className="text-sm text-ink-2">
                Complete a practice test to see accuracy by instructional area.
              </p>
            ) : (
              <div className="flex flex-col gap-[13px]">
                {accuracy.map((row, index) => (
                  <div
                    key={row.name}
                    className="grid grid-cols-[minmax(0,210px)_1fr_44px] items-center gap-4"
                  >
                    <span className="truncate text-[13px] font-semibold">{row.name}</span>
                    <Rail
                      fill={row.accuracy / 100}
                      tone={accuracyTone(row.accuracy)}
                      delay={index * 60}
                      height="h-[14px]"
                      className="mt-0"
                    />
                    <span className="text-right text-[13px] font-bold">{row.accuracy}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="deca-card px-[30px] py-7">
            <div className="mb-1.5 flex items-baseline justify-between">
              <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
                Last eight practice exams
              </h2>
              <span className="text-xs font-bold text-mute">score out of 100</span>
            </div>
            <ExamTrend points={trend} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="deca-card px-[26px] py-6">
            <h2 className="font-display text-[17px] font-extrabold tracking-[-0.02em]">
              Work on these next
            </h2>
            <p className="mt-1 mb-4 text-xs text-mute">
              Indicators under 70% accuracy
            </p>
            {weakPis.length === 0 ? (
              <p className="text-sm text-ink-2">
                No weak indicators yet — keep practicing or take a PI-targeted quiz.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {weakPis.map((pi) => (
                  <Link
                    key={pi.code}
                    href={pi.href ?? "/tests/pi-targeted"}
                    className="flex items-center justify-between gap-2.5 text-ink hover:text-ink"
                  >
                    <span className="text-[13px] leading-[1.4]">{pi.text}</span>
                    <span className="flex-none rounded-full bg-gold-lt px-2.5 py-[3px] text-xs font-extrabold text-gold">
                      {pi.meta.split(" · ")[0]}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="deca-card px-[26px] py-6">
            <h2 className="mb-3.5 font-display text-[17px] font-extrabold tracking-[-0.02em]">
              Waiting on an officer
            </h2>
            {waiting.length === 0 ? (
              <p className="text-sm text-ink-2">No roleplays waiting for a grade.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {waiting.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-2.5">
                    <span className="text-[13px]">{item.name}</span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-[3px] text-[11px] font-extrabold",
                        item.live
                          ? "bg-ever-lt text-ever-dk"
                          : "bg-ground text-mute",
                      )}
                    >
                      {item.live ? "IN REVIEW" : "QUEUED"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col rounded-[20px] bg-ever-dk p-[26px] text-white">
            <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-white/95">
              Next up
            </p>
            <p className="mt-2.5 font-display text-[19px] font-extrabold leading-[1.25] tracking-[-0.02em]">
              {NEXT_CONFERENCE.name}
            </p>
            <p className="mt-2 mb-[18px] text-[13px] text-white/95">
              {NEXT_CONFERENCE.when}
            </p>
            <DecaButton href="/events" variant="white" size="sm" className="mt-auto self-start">
              See checklist
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
    <div className="deca-card px-[26px] py-6">
      <p className="text-xs font-semibold text-mute">{label}</p>
      <p className="mt-2 font-display text-4xl font-black tracking-[-0.035em]">
        {value}
        {suffix ? <span className="text-lg text-mute">{suffix}</span> : null}
      </p>
      {note ? <p className="mt-[11px] text-xs text-mute">{note}</p> : null}
      {rail != null ? <Rail fill={rail} height="h-[7px]" className="mt-3.5" /> : null}
    </div>
  );
}

function ExamTrend({ points }: { points: DashboardTrendPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="mt-4 text-sm text-ink-2">
        Complete a full or custom test to see your score trend.
      </p>
    );
  }

  const width = 620;
  const height = 150;
  const pad = 10;
  const xs = points.map((_, i) =>
    points.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (points.length - 1),
  );
  const ys = points.map((point) => {
    const t = (100 - Math.max(0, Math.min(100, point.score))) / 100;
    return 20 + t * 100;
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
        className="mt-2 block h-[150px] w-full overflow-visible"
        aria-label="Practice exam trend"
      >
        <defs>
          <linearGradient id="v8g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7d9068" stopOpacity="0.22" />
            <stop offset="1" stopColor="#7d9068" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#v8g)" />
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
          r="6"
          fill="#47583c"
          stroke="#fff"
          strokeWidth="2.5"
        />
        <text
          x={xs[xs.length - 1]}
          y={Math.max(14, ys[ys.length - 1] - 16)}
          textAnchor="end"
          fontSize="13"
          fontWeight="800"
          fill="#2b2a25"
        >
          {last?.score ?? ""}
        </text>
      </svg>
      <div className="mt-1.5 flex justify-between text-[11px] font-bold text-mute">
        {points
          .filter(
            (_, i) =>
              i === 0 ||
              i === points.length - 1 ||
              i === Math.floor(points.length / 3) ||
              i === Math.floor((points.length * 2) / 3),
          )
          .map((point) => (
            <span key={`${point.label}-${point.score}`}>{point.label}</span>
          ))}
      </div>
    </>
  );
}
