import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "student" | "officer" | "advisor";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_role");
  if (error || !data) {
    return null;
  }
  return data as UserRole;
}

export async function requireAuth(next?: string) {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(next ?? "/dashboard")}`);
  }
  return user;
}

export async function requireRole(roles: UserRole[], next?: string) {
  const user = await requireAuth(next);
  const role = await getUserRole(user.id);
  if (!role || !roles.includes(role)) {
    redirect("/dashboard");
  }
  return { user, role };
}

export function displayName(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || email?.split("@")[0] || "Member";
}
