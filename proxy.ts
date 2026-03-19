import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasCurrentRequiredPolicyAcceptance } from "@/lib/carebridge/policy-acceptance";
import { getRoleHomePath } from "@/lib/config/brand";
import { Role } from "@/lib/auth/roles";

const AUTH_PAGES = ["/login", "/signup"];
const CONSENT_PAGE = "/consent";
const PROTECTED_PREFIXES = ["/portal", "/provider", "/admin", "/settings", "/visit"];
const LEGACY_REDIRECTS: Record<string, string> = {
  "/app": "/portal",
};

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function getRequiredAreaRole(pathname: string): "patient" | "provider" | "admin" | null {
  if (pathname === "/provider/onboarding" || pathname.startsWith("/provider/onboarding/")) return null;
  if (pathname === "/provider") return null;
  if (pathname.startsWith("/provider/")) return "provider";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/portal" || pathname.startsWith("/portal/")) return "patient";
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico") || pathname.includes(".")) {
    return NextResponse.next();
  }

  for (const [legacyPath, targetPath] of Object.entries(LEGACY_REDIRECTS)) {
    if (pathname === legacyPath || pathname.startsWith(`${legacyPath}/`)) {
      const redirected = pathname.replace(legacyPath, targetPath);
      return NextResponse.redirect(new URL(redirected, request.url));
    }
  }

  const needsSessionCheck =
    matchesPrefix(pathname, PROTECTED_PREFIXES) ||
    matchesPrefix(pathname, AUTH_PAGES) ||
    pathname === CONSENT_PAGE;
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

  let role: Role | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: Role }>();
    role = profile?.role ?? "patient";
  }

  if (matchesPrefix(pathname, AUTH_PAGES) && user) {
    if (!hasCurrentRequiredPolicyAcceptance(user)) {
      return NextResponse.redirect(new URL(CONSENT_PAGE, request.url));
    }
    return NextResponse.redirect(new URL(getRoleHomePath(role), request.url));
  }

  if (pathname === CONSENT_PAGE && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (matchesPrefix(pathname, PROTECTED_PREFIXES) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (matchesPrefix(pathname, PROTECTED_PREFIXES) && user && !user.email_confirmed_at) {
    return NextResponse.redirect(new URL("/verify", request.url));
  }

  if (user && !hasCurrentRequiredPolicyAcceptance(user) && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    const consentUrl = new URL(CONSENT_PAGE, request.url);
    const nextPath = pathname + request.nextUrl.search;
    consentUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(consentUrl);
  }

  if (pathname === CONSENT_PAGE && user && hasCurrentRequiredPolicyAcceptance(user)) {
    const next = request.nextUrl.searchParams.get("next");
    return NextResponse.redirect(new URL(next || getRoleHomePath(role), request.url));
  }

  const requiredRole = getRequiredAreaRole(pathname);
  if (requiredRole === "provider" && role !== "provider" && role !== "admin" && role !== "organization_owner") {
    return NextResponse.redirect(new URL(getRoleHomePath(role), request.url));
  }

  if (requiredRole === "admin" && role !== "admin" && role !== "organization_owner" && role !== "support_staff") {
    return NextResponse.redirect(new URL(getRoleHomePath(role), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!.*\\.).*)"],
};
