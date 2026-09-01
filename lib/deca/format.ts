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
