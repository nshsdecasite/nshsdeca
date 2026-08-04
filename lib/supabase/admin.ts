import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase/env";

export function createAdminClient() {
  return createClient(
    getSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
