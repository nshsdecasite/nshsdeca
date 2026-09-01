import Link from "next/link";
import type { PiHeatmapCell } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

function tone(accuracy: number) {
  if (accuracy >= 80) return "bg-primary text-primary-foreground";
  if (accuracy >= 70) return "bg-primary/40 text-primary";
  if (accuracy >= 50) return "bg-amber-100 text-amber-900";
  return "bg-red-100 text-red-800";
}

export function PiHeatmap({ cells }: { cells: PiHeatmapCell[] }) {
  if (cells.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Take a few tests to build your PI heatmap.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
        {cells.map((cell) => (
          <Link
            key={cell.id}
            href={`/study/pis/${cell.id}`}
            title={`${cell.pi_code} · ${cell.accuracy}% · ${cell.indicator_text}`}
            className={cn(
              "flex min-h-10 items-center justify-center rounded-md px-1 text-[10px] font-semibold tabular-nums transition-opacity hover:opacity-80",
              tone(cell.accuracy),
            )}
          >
            {cell.pi_code.replace(/^PI:?/i, "").slice(0, 8)}
          </Link>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Color is accuracy on tests. Red is weak, green is strong.
      </p>
    </div>
  );
}
