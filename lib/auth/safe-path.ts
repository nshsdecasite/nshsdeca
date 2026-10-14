export function safeInternalPath(value: string | null | undefined) {
  if (!value) return "/dashboard";

  const path = value.trim();
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    path.includes("://")
  ) {
    return "/dashboard";
  }

  const pathname = path.split("?")[0] ?? path;
  if (pathname === "/login" || pathname === "/signup") {
    return "/dashboard";
  }

  if (pathname === "/events" || pathname.startsWith("/events/")) {
    return "/calendar";
  }

  return path;
}
