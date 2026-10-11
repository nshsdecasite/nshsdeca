import type { ReactNode } from "react";
import { getUnreadMessageCount } from "@/app/messages/actions";
import { getMyProfile } from "@/app/platform/actions";
import { ChooseUsername } from "@/components/auth/choose-username";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { SessionFocusProvider } from "@/components/layout/session-focus-context";
import { displayName, getSessionUser, getUserRole } from "@/lib/auth/roles";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  const [profile, role, unreadCount] = user
    ? await Promise.all([
        getMyProfile().catch(() => null),
        getUserRole(user.id),
        getUnreadMessageCount(),
      ])
    : [null, null, 0];

  const name = displayName(
    profile?.first_name ?? (user?.user_metadata?.first_name as string | undefined),
    profile?.last_name ?? (user?.user_metadata?.last_name as string | undefined),
    profile?.email ?? user?.email,
  );
  const grade = profile?.grade_level;
  const gradeWord =
    grade === 9
      ? "Freshman"
      : grade === 10
        ? "Sophomore"
        : grade === 11
          ? "Junior"
          : grade === 12
            ? "Senior"
            : null;
  const roleWord =
    role === "officer" ? "Officer" : role === "advisor" ? "Advisor" : "Member";
  const gradeLabel = [gradeWord, roleWord].filter(Boolean).join(" · ");
  const initials = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .map((part) => part!.slice(0, 1).toUpperCase())
    .join("")
    .slice(0, 2) || name.slice(0, 2).toUpperCase();

  if (profile?.username_confirmed === false) {
    return (
      <ChooseUsername username={profile.username ?? ""} name={name} />
    );
  }

  return (
    <SessionFocusProvider>
      <AuthenticatedLayout
        displayName={name}
        gradeLabel={gradeLabel || undefined}
        initials={initials}
        role={role}
        unreadCount={unreadCount}
      >
        {children}
      </AuthenticatedLayout>
    </SessionFocusProvider>
  );
}
