export function monoDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = date
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  const day = String(date.getDate()).padStart(2, "0");
  return `${month} ${day}`;
}

export function monoTime(value: Date) {
  const hours = value.getHours();
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes}`;
}

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function weeksUntil(isoDate: string) {
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return 0;
  const diff = target.getTime() - Date.now();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24 * 7)));
}

export function sessionKind(sessionType: string, totalQuestions?: number) {
  if (sessionType === "full" || sessionType === "official_exam") return "Full test";
  if (sessionType === "custom") {
    return totalQuestions ? `Custom, ${totalQuestions}q` : "Custom";
  }
  if (sessionType === "pi_targeted") {
    return totalQuestions ? `Targeted, ${totalQuestions}q` : "Targeted";
  }
  if (sessionType === "roleplay") return "Roleplay";
  return sessionType.replaceAll("_", " ");
}
