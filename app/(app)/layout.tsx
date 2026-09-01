import type { ReactNode } from "react";
import { getUnreadMessageCount } from "@/app/messages/actions";
import { getMyProfile } from "@/app/platform/actions";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { SessionFocusProvider } from "@/components/layout/session-focus-context";
import { displayName, getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getMyProfile().catch(() => null) : null;
  const name = displayName(
    profile?.first_name ?? (user?.user_metadata?.first_name as string | undefined),
    profile?.last_name ?? (user?.user_metadata?.last_name as string | undefined),
    profile?.email ?? user?.email,
  );
  const role = user ? await getUserRole(user.id) : null;
  const unreadCount = user ? await getUnreadMessageCount() : 0;
  const grade = profile?.grade_level;
  const gradeLabel = [
    grade ? `GRADE ${grade}` : null,
    role ? role.toUpperCase() : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SessionFocusProvider>
      <AuthenticatedLayout
        displayName={name}
        gradeLabel={gradeLabel || undefined}
        role={role}
        unreadCount={unreadCount}
      >
        {children}
      </AuthenticatedLayout>
    </SessionFocusProvider>
  );
}
