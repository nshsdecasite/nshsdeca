import Link from "next/link";
import { LEVEL_LABELS, type ScenarioSummary } from "@/lib/roleplay/scenario-types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ScenarioCardProps = {
  scenario: ScenarioSummary;
};

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  const title =
    scenario.scenario_title?.trim() ||
    `${scenario.event_code} scenario ${scenario.scenario_number}`;

  return (
    <Link href={`/roleplays/${scenario.id}`} className="group block h-full active:scale-[0.96]">
      <Card className="flex h-full flex-col p-5 transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-border-hover">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge>{scenario.event_code}</Badge>
          <Badge variant="muted">{LEVEL_LABELS[scenario.level]}</Badge>
          <Badge variant="muted" className="tabular-nums">
            {scenario.year}
          </Badge>
        </div>

        <h3 className="text-base font-semibold text-foreground group-hover:text-primary">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{scenario.event_name}</p>

        {scenario.preview ? (
          <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {scenario.preview}
          </p>
        ) : (
          <div className="flex-1" />
        )}

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {scenario.instructional_area_code ? (
            <span>IA: {scenario.instructional_area_code}</span>
          ) : null}
          {scenario.career_pathway ? <span>{scenario.career_pathway}</span> : null}
        </div>
      </Card>
    </Link>
  );
}
