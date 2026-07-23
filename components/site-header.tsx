import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { LogoLink } from "@/components/logo";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
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
    <header className="sticky top-0 z-50 border-b border-deca-green/10 bg-white/85 backdrop-blur-md shadow-soft">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <LogoLink />

        <nav className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="hidden min-h-10 items-center rounded-xl px-4 text-sm font-medium text-muted transition-[color,transform] duration-150 hover:text-deca-green sm:inline-flex active:scale-[0.96]"
              >
                Dashboard
              </Link>
              <Link
                href="/submissions"
                className="hidden min-h-10 items-center rounded-xl px-4 text-sm font-medium text-muted transition-[color,transform] duration-150 hover:text-deca-green sm:inline-flex active:scale-[0.96]"
              >
                Submissions
              </Link>
              {role === "student" && (
                <Link
                  href="/roleplays/submit"
                  className="hidden min-h-10 items-center rounded-xl px-4 text-sm font-medium text-muted transition-[color,transform] duration-150 hover:text-deca-green sm:inline-flex active:scale-[0.96]"
                >
                  Submit
                </Link>
              )}
              {(role === "officer" || role === "advisor") && (
                <Link
                  href="/admin/grading"
                  className="hidden min-h-10 items-center rounded-xl px-4 text-sm font-medium text-muted transition-[color,transform] duration-150 hover:text-deca-green sm:inline-flex active:scale-[0.96]"
                >
                  Grading
                </Link>
              )}
              <span className="hidden text-sm text-muted sm:inline">
                Hi, <span className="font-medium text-ink">{firstName}</span>
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-medium text-muted transition-[color,transform] duration-150 hover:text-ink active:scale-[0.96]"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-medium text-muted transition-[color,transform] duration-150 hover:text-ink active:scale-[0.96]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-10 items-center rounded-2xl bg-deca-green px-4 text-sm font-semibold text-white shadow-soft transition-[background-color,transform] duration-150 hover:bg-deca-green-dark active:scale-[0.96]"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
