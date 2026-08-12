function normalizeSupabaseUrl(url: string | undefined): string {
  if (!url) {
    throw new Error("Missing SUPABASE_URL");
  }

  return url.replace(/^http:\/\//i, "https://").replace(/\/$/, "");
}

export function getSupabaseUrl(): string {
  return normalizeSupabaseUrl(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function getSupabaseAnonKey(): string {
  const key =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error("Missing SUPABASE_ANON_KEY");
  }

  return key;
}
