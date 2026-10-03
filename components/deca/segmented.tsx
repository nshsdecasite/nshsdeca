import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  name,
  appearance = "solid",
}: {
  value: T | null;
  options: { value: T; label: string; gold?: boolean }[];
  onChange?: (value: T) => void;
  name?: string;
  appearance?: "solid" | "tint";
}) {
  return (
    <div
      role={onChange ? "radiogroup" : undefined}
      className="flex rounded-full bg-ground p-1 text-[13px] font-bold"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role={onChange ? "radio" : undefined}
            aria-checked={onChange ? selected : undefined}
            name={name}
            disabled={!onChange}
            onClick={() => onChange?.(option.value)}
            className={cn(
              "min-h-10 flex-1 rounded-full px-3 py-2 text-center tabular-nums transition-[background-color,color] duration-150 disabled:cursor-default",
              selected && appearance === "solid" && "bg-ever-dk text-white",
              selected && appearance === "tint" && "bg-white text-ever-dk shadow-card",
              !selected && "text-ink-2 hover:text-ever-dk",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
