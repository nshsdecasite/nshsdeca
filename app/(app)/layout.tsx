import type { ReactNode } from "react";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { SessionFocusProvider } from "@/components/layout/session-focus-context";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName =
    (user?.user_metadata?.first_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Member";
  const role = user ? await getUserRole(user.id) : null;

  return (
    <SessionFocusProvider>
      <AuthenticatedLayout firstName={firstName} role={role}>
        {children}
      </AuthenticatedLayout>
    </SessionFocusProvider>
  );
}
