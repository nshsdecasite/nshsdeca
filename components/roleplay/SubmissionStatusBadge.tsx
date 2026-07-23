import { STATUS_LABELS, type SubmissionStatus } from "@/lib/roleplay/types";

const colors: Record<SubmissionStatus, string> = {
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  reviewed: "bg-green-100 text-green-700",
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
