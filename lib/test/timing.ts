export const FULL_EXAM_SECONDS = 90 * 60;
export const SECONDS_PER_QUESTION = 54;

export function customTestSeconds(questionCount: number) {
  return Math.max(questionCount, 1) * SECONDS_PER_QUESTION;
}

export function remainingSeconds(startedAt: string, timeLimitSeconds: number) {
  const endsAt = Date.parse(startedAt) + timeLimitSeconds * 1000;
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

export function formatCountdown(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}
