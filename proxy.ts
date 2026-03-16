import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PREFIXES = ["/app", "/admin", "/settings"];
const AUTH_PAGES = ["/login", "/signup"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAuthPage(pathname: string) {
  return AUTH_PAGES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const needsSessionCheck = isProtectedPath(pathname) || isAuthPage(pathname);

  if (!needsSessionCheck) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAuthPage(pathname) && user) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  if (isProtectedPath(pathname) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isProtectedPath(pathname) && user && !user.email_confirmed_at) {
    return NextResponse.redirect(new URL("/verify", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!.*\\.).*)"],
};
