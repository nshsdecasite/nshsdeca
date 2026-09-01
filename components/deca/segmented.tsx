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
      className="flex overflow-hidden rounded-[6px] border border-edge text-[13px]"
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        const exceeds = Boolean(option.gold && selected);
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
              "flex-1 px-0 py-[9px] text-center transition-[background-color,color] duration-150 disabled:cursor-default",
              index > 0 && "border-l border-edge",
              exceeds && "bg-gold-br text-ever-dk",
              selected &&
                !exceeds &&
                appearance === "solid" &&
                "bg-ever text-white",
              selected &&
                !exceeds &&
                appearance === "tint" &&
                "bg-ever-lt text-ever-dk",
              !selected &&
                "bg-white text-ink-2 hover:bg-ever-lt hover:text-ever-dk",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
