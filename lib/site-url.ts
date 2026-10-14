/** Public site origin. On Vercel, a localhost SITE_URL is ignored. */
export function getSiteUrl() {
  const configured = process.env.SITE_URL?.trim().replace(/\/$/, "");
  const isLocal =
    !configured || /localhost|127\.0\.0\.1/.test(configured);
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;

  if (isLocal && vercelHost) {
    const host = vercelHost.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  return configured || "http://localhost:3000";
}
