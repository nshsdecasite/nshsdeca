export function displayName(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || email?.split("@")[0] || "Member";
}
