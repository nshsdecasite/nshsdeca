import { cn } from "@/lib/utils";

type RailTone = "ever" | "gold" | "ever-dim";

export function Rail({
  fill,
  tone = "ever",
  delay = 0,
  className,
  height = "h-[9px]",
}: {
  fill: number;
  tone?: RailTone;
  delay?: number;
  className?: string;
  height?: string;
}) {
  const clamped = Math.max(0, Math.min(1, fill));

  return (
    <span
      className={cn("mt-2 block overflow-hidden rounded-full bg-ground", height, className)}
      aria-hidden
    >
      <span
        className={cn(
          "block h-full origin-left animate-rail-fill rounded-full",
          tone === "gold" && "bg-ever",
          tone === "ever" && "bg-ever",
          tone === "ever-dim" && "bg-acc-mid",
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
      <span className="pointer-events-none absolute inset-x-0 h-[5px] rounded-full bg-white/25" />
      <span
        className="pointer-events-none absolute left-0 h-[5px] rounded-full bg-ever"
        style={{ width: `${clamped * 100}%` }}
      />
      {ticks.map((tick) => (
        <span
          key={tick}
          className="pointer-events-none absolute top-1/2 h-[13px] w-[3px] -translate-y-1/2 rounded-[2px] bg-white"
          style={{ left: `${Math.max(0, Math.min(1, tick)) * 100}%` }}
        />
      ))}
    </div>
  );
}
