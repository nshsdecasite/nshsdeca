import { cn } from "@/lib/utils";

type RailTone = "ever" | "gold" | "ever-dim";

export function Rail({
  fill,
  tone = "ever",
  delay = 0,
  className,
}: {
  fill: number;
  tone?: RailTone;
  delay?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, fill));

  return (
    <span
      className={cn("mt-2 block h-1 overflow-hidden bg-ground-2", className)}
      aria-hidden
    >
      <span
        className={cn(
          "block h-1 origin-left animate-rail-fill",
          tone === "gold" && "bg-gold-br",
          tone === "ever" && "bg-ever",
          tone === "ever-dim" && "bg-ever opacity-55",
        )}
        style={{
          width: `${clamped * 100}%`,
          animationDelay: `${delay}ms`,
        }}
      />
    </span>
  );
}

export function ScrubRail({
  progress,
  ticks = [],
  onSeek,
  className,
}: {
  progress: number;
  ticks?: number[];
  onSeek?: (ratio: number) => void;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <div className={cn("relative flex h-6 items-center", className)}>
      <button
        type="button"
        aria-label="Seek and comment on the recording"
        className="absolute inset-0 cursor-pointer"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = Math.max(
            0,
            Math.min(1, (event.clientX - rect.left) / rect.width),
          );
          onSeek?.(ratio);
        }}
      />
      <span className="pointer-events-none absolute inset-x-0 h-1 bg-ground-2" />
      <span
        className="pointer-events-none absolute left-0 h-1 bg-ever"
        style={{ width: `${clamped * 100}%` }}
      />
      {ticks.map((tick) => (
        <span
          key={tick}
          className="pointer-events-none absolute h-3.5 w-0.5 bg-ever opacity-50"
          style={{ left: `${Math.max(0, Math.min(1, tick)) * 100}%` }}
        />
      ))}
      <span
        className="pointer-events-none absolute h-3 w-3 rounded-full bg-gold-br"
        style={{
          left: `${clamped * 100}%`,
          transform: "translateX(-6px)",
          boxShadow: "0 0 0 4px var(--color-gold-lt)",
        }}
      />
    </div>
  );
}
