import Link from "next/link";
import type { PiSummary } from "@/lib/study/pi-types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type PiCardProps = {
  pi: PiSummary;
};

export function PiCard({ pi }: PiCardProps) {
  return (
    <Link href={`/study/pis/${pi.id}`} className="group block h-full active:scale-[0.96]">
      <Card className="flex h-full flex-col p-5 transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-border-hover">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge>{pi.pi_code}</Badge>
          {pi.instructional_area_code ? (
            <Badge variant="muted">{pi.instructional_area_code}</Badge>
          ) : null}
        </div>

        <p className="flex-1 text-sm leading-relaxed text-foreground group-hover:text-primary">
          {pi.indicator_text}
        </p>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {pi.question_count} test question{pi.question_count === 1 ? "" : "s"}
          </span>
          <span className="tabular-nums">
            {pi.roleplay_count} roleplay event{pi.roleplay_count === 1 ? "" : "s"}
          </span>
          {pi.cluster_name ? <span>{pi.cluster_name}</span> : null}
        </div>
      </Card>
    </Link>
  );
}
