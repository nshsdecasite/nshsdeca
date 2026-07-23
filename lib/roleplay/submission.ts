import { detectVideoSource, type VideoSource } from "@/lib/roleplay/video";
import type { Submission } from "@/lib/roleplay/types";

export function resolveVideoSource(submission: {
  video_url: string;
  video_source?: VideoSource | null;
}): VideoSource {
  return (
    submission.video_source ??
    detectVideoSource(submission.video_url) ??
    "google-drive"
  );
}

export function submissionToLegacy(submission: Submission) {
  return {
    id: submission.id,
    scenarioId: submission.scenario_key,
    event: "",
    attemptNumber: submission.attempt_number,
    videoUrl: submission.video_url,
    videoSource: resolveVideoSource(submission),
    status: submission.status,
    studentName: submission.student_name ?? "Student",
    submittedAt: submission.submitted_at,
    grading: submission.grading_data ?? undefined,
  };
}
