import { STATUS_LABELS, type SubmissionStatus } from "@/lib/roleplay/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const colors: Record<SubmissionStatus, string> = {
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  reviewed: "bg-primary/10 text-primary",
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <Badge className={cn("normal-case", colors[status])}>{STATUS_LABELS[status]}</Badge>
  );
}
