import { cache } from "react";
import type { UserProfile } from "@/lib/platform/types";
import { createClient } from "@/lib/supabase/server";

export const loadMyProfile = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error) throw new Error(error.message);
  return (data as UserProfile | null) ?? null;
});

export const loadUnreadMessageCount = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unread_message_count");
  if (error) return 0;
  return Number(data ?? 0);
});
