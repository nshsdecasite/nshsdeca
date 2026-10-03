import { cn } from "@/lib/utils";
import {
  LEVEL_LABELS,
  pointsInLevel,
  type RubricLevelScale,
} from "@/lib/roleplay/rubric";

export function PointScale({
  value,
  levels,
  onChange,
  name,
  size = "md",
  labeled = false,
}: {
  value: string;
  levels: RubricLevelScale[];
  onChange?: (value: string) => void;
  name?: string;
  size?: "md" | "lg";
  labeled?: boolean;
}) {
  const large = size === "lg";

  return (
    <div
      role={onChange ? "radiogroup" : undefined}
      aria-label={name}
      className={cn(
        "grid",
        large ? "grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5" : "grid-cols-2 gap-1.5 sm:grid-cols-4",
      )}
    >
      {levels.map((level) => {
        const points = pointsInLevel(level);
        const label =
          LEVEL_LABELS[level.level_name] ??
          level.level_name.replaceAll("_", " ");
        return (
          <div
            key={level.id ?? `${level.level_name}-${level.level_order}`}
            role="group"
            aria-label={label}
            className={cn(
              "flex flex-col items-center rounded-2xl bg-ground",
              large ? "min-h-12 px-1.5 py-1.5" : "px-1 py-1",
            )}
          >
            <span
              className={cn(
                "mb-1 text-[10px] font-bold tracking-[0.12em] uppercase text-mute",
                labeled ? "block" : "max-sm:hidden sm:block sm:invisible",
              )}
            >
              {label}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-0.5">
              {points.map((point) => {
                const option = String(point);
                const selected = option === value;
                return (
                  <button
                    key={option}
                    type="button"
                    role={onChange ? "radio" : undefined}
                    aria-checked={onChange ? selected : undefined}
                    disabled={!onChange}
                    onClick={() => onChange?.(option)}
                    className={cn(
                      "rounded-full text-center font-bold tabular-nums transition-[background-color,color,transform] duration-150 active:scale-[0.96] disabled:cursor-default disabled:active:scale-100",
                      large
                        ? "min-h-11 min-w-11 px-2.5 text-[15px]"
                        : "min-h-10 min-w-8 px-2.5 text-[13px]",
                      selected && "bg-ever-dk text-white",
                      !selected && "text-ink-2 hover:bg-white hover:text-ever-dk",
                    )}
                  >
                    {point}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
