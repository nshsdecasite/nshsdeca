import Link from "next/link";
import type { ScenarioPerformanceIndicator } from "@/lib/roleplay/scenario-types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PiLinkProps = {
  piId: string | null;
  piCode: string | null;
  label?: string;
  className?: string;
};

export function PiLink({ piId, piCode, label, className = "" }: PiLinkProps) {
  const text = label ?? piCode ?? "View PI";

  if (!piId) {
    return (
      <Badge variant="muted" className={cn("normal-case", className)}>
        {text}
      </Badge>
    );
  }

  return (
    <Link href={`/study/pis/${piId}`} className={className}>
      <Badge className="normal-case transition-colors hover:bg-primary/15">
        {piCode ? `${piCode} · ` : ""}
        {label ? label : "View PI"}
      </Badge>
    </Link>
  );
}

type PerformanceIndicatorsListProps = {
  pis: ScenarioPerformanceIndicator[];
};

export function PerformanceIndicatorsList({ pis }: PerformanceIndicatorsListProps) {
  if (!pis.length) return null;

  return (
    <Card className="p-6 sm:p-8">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
          Performance indicators
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          These are the PIs officers grade on for this event. Tap one to see linked
          test questions and other roleplays.
        </p>
        <ol className="mt-5 space-y-3">
          {pis.map((pi) => (
            <li
              key={`${pi.display_order}-${pi.indicator_text}`}
              className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-muted px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  PI {pi.display_order}
                  {pi.pi_code ? ` · ${pi.pi_code}` : ""}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {pi.indicator_text}
                </p>
              </div>
              {pi.pi_id ? (
                <Link
                  href={`/study/pis/${pi.pi_id}`}
                  className="inline-flex shrink-0 items-center text-sm font-medium text-primary transition-colors hover:text-primary"
                >
                  Explore →
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </Card>
  );
}
