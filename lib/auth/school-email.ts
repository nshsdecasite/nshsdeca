const DEFAULT_DOMAINS = ["dallasisd.org"];

export function allowedSchoolEmailDomains() {
  const extra = (process.env.CHAPTER_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set([...DEFAULT_DOMAINS, ...extra])];
}

export function isAllowedSchoolEmail(email: string) {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return false;

  return allowedSchoolEmailDomains().some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
  );
}

export function schoolEmailHint() {
  const domains = allowedSchoolEmailDomains();
  if (domains.length === 1) {
    return `Use a @${domains[0]} email.`;
  }
  return `Use a school email (${domains.map((domain) => `@${domain}`).join(" or ")}).`;
}
