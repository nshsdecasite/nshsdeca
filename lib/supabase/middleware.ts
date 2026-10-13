import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

const REFRESH_MARGIN_MS = 90_000;

function isAuthPage(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup"
  );
}

function isProtected(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/roleplays") ||
    pathname.startsWith("/generate") ||
    pathname.startsWith("/tests") ||
    pathname.startsWith("/submissions") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/study") ||
    pathname.startsWith("/notes") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/messages")
  );
}

function redirectTo(request: NextRequest, pathname: string, next?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (next) url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

function isSessionCookie(name: string) {
  return /-auth-token(?:\.\d+)?$/.test(name);
}

function decodeBase64Url(value: string): string {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Milliseconds until the access token expires, or null when there is no session cookie. */
function sessionExpiryMs(request: NextRequest): number | null {
  const cookies = request.cookies.getAll().filter((cookie) => isSessionCookie(cookie.name));
  if (cookies.length === 0) return null;

  const chunked = cookies.filter((cookie) => /\.\d+$/.test(cookie.name));
  const parts = (chunked.length > 0 ? chunked : cookies).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );

  let raw = parts.map((part) => part.value).join("");
  if (raw.startsWith("base64-")) {
    try {
      raw = decodeBase64Url(raw.slice("base64-".length));
    } catch {
      return 0;
    }
  }

  try {
    const session = JSON.parse(raw) as { expires_at?: number };
    if (typeof session.expires_at === "number") return session.expires_at * 1000;
  } catch {
    return 0;
  }

  return 0;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedRoute = isProtected(pathname);
  const authPage = isAuthPage(pathname);
  const expiresAt = sessionExpiryMs(request);

  // Public pages with no session never touch Auth. A paused or slow project
  // used to block the homepage on repeated token-refresh retries.
  if (expiresAt == null) {
    if (protectedRoute) return redirectTo(request, "/login", pathname);
    return NextResponse.next({ request });
  }

  // A still-valid access token does not need a network round trip. Refresh
  // only inside the margin so cookies stay current before they expire.
  if (expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    if (authPage) return redirectTo(request, "/dashboard");
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && protectedRoute) {
    return redirectTo(request, "/login", pathname);
  }

  if (user && authPage) {
    return redirectTo(request, "/dashboard");
  }

  return supabaseResponse;
}
