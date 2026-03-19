"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SignOutButton from "@/app/components/SignOutButton";
import { BRAND, PUBLIC_NAV_LINKS } from "@/lib/config/brand";

type SiteChromeProps = {
  children: React.ReactNode;
  isAuthenticated: boolean;
  userEmail: string | null;
};

const PRIVATE_PREFIXES = ["/portal", "/provider", "/admin"];
const FOOTERLESS_PREFIXES = ["/visit"];
const FOOTER_COLUMNS = [
  {
    heading: "Patients",
    links: [
      { href: "/providers", label: "Find a Provider" },
      { href: "/services", label: "Book Appointments" },
      { href: "/resources", label: "Resources" },
      { href: "/community", label: "Community" },
      { href: "/recipes", label: "Recipes" },
    ],
  },
  {
    heading: "Providers",
    links: [
      { href: "/providers/join", label: "Join CareBridge" },
      { href: "/resources", label: "Provider Resources" },
      { href: "/services", label: "Telehealth Tools" },
      { href: "/faq", label: "Provider FAQ" },
    ],
  },
  {
    heading: "CareBridge",
    links: [
      { href: "/about", label: "About" },
      { href: "/services", label: "Services" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Legal & Support",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms" },
      { href: "/accessibility", label: "Accessibility" },
      { href: "/help", label: "Help" },
    ],
  },
] as const;

export default function SiteChrome({ children, isAuthenticated, userEmail }: SiteChromeProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isHomePage = pathname === "/";
  const hideFooter = FOOTERLESS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen bg-[var(--background)]">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(79,182,168,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(109,190,69,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.6),transparent_70%)]" />

      <header className="sticky top-0 z-40">
        <div
          className={`transition-all duration-300 ${
            scrolled
              ? "border-b border-[var(--border)] bg-[rgba(245,243,238,0.92)] shadow-[0_18px_36px_rgba(31,77,57,0.08)] backdrop-blur-xl"
              : "bg-transparent"
          }`}
        >
          <div className="shell py-5">
            <nav
              aria-label="Primary"
              className={`flex items-center justify-between gap-6 lg:grid lg:items-center lg:gap-10 ${
                isHomePage ? "lg:grid-cols-[1fr_auto_1fr]" : "lg:grid-cols-[auto_1fr_auto]"
              }`}
            >
              {isHomePage ? (
                <div className="hidden lg:block lg:min-h-[1px]" aria-hidden="true" />
              ) : (
                <Link href="/" className="min-w-0 lg:justify-self-start">
                  <div className="flex items-center">
                    <Image
                      src="/images/carebridge-logo.png"
                      alt="CareBridge"
                      width={320}
                      height={88}
                      className="h-14 w-auto object-contain sm:h-16"
                    />
                  </div>
                </Link>
              )}

              <div className="hidden items-center justify-center gap-7 lg:flex xl:gap-9 lg:justify-self-center">
                {PUBLIC_NAV_LINKS.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`text-sm font-medium transition-colors hover:text-[var(--accent-strong)] ${
                        active ? "text-[var(--accent-strong)]" : "text-[rgba(43,36,28,0.78)]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <div className="hidden items-center gap-3 lg:flex lg:justify-self-end">
                {isAuthenticated ? (
                  <>
                    <Link href="/portal" className="btn-primary px-5 py-3">
                      Open Portal
                    </Link>
                    {userEmail ? (
                      <div className="inline-panel px-4 py-2 text-sm muted">{userEmail}</div>
                    ) : null}
                    <SignOutButton />
                  </>
                ) : (
                  <>
                    <Link href="/login" className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--accent-strong)]">
                      Sign in
                    </Link>
                    <Link href="/signup" className="btn-primary px-5 py-3">
                      Get Started
                    </Link>
                  </>
                )}
              </div>

              <button
                type="button"
                aria-expanded={menuOpen}
                aria-controls="mobile-site-menu"
                aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] border border-[var(--border)] bg-white/70 lg:hidden"
              >
                <span className="flex w-5 flex-col gap-1.5">
                  <span className={`block h-0.5 rounded-full bg-[var(--foreground)] transition-transform duration-200 ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
                  <span className={`block h-0.5 rounded-full bg-[var(--foreground)] transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`} />
                  <span className={`block h-0.5 rounded-full bg-[var(--foreground)] transition-transform duration-200 ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
                </span>
              </button>
            </nav>

            <div
              id="mobile-site-menu"
              className={`overflow-hidden transition-all duration-300 lg:hidden ${
                menuOpen ? "mt-5 max-h-[32rem] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="inline-panel space-y-3 px-4 py-4">
                {PUBLIC_NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-2 text-sm font-medium text-[rgba(43,36,28,0.82)]"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="section-rule mt-2 flex flex-col gap-3">
                  {isAuthenticated ? (
                    <>
                      <Link href="/portal" onClick={() => setMenuOpen(false)} className="btn-primary">
                        Open Portal
                      </Link>
                      {userEmail ? <div className="inline-panel px-4 py-3 text-sm muted">{userEmail}</div> : null}
                      <SignOutButton />
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-[var(--foreground)]">
                        Sign in
                      </Link>
                      <Link href="/signup" onClick={() => setMenuOpen(false)} className="btn-primary">
                        Get Started
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className={hideFooter ? "pb-0" : "pb-20"}>{children}</main>

      {hideFooter ? null : (
        <footer className="shell pb-10">
          <div className="rounded-[18px] border border-[var(--border)] bg-[rgba(255,252,246,0.92)] px-6 py-8 shadow-[0_16px_34px_rgba(97,84,58,0.07)] sm:px-8">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_repeat(4,minmax(0,1fr))]">
              <div>
                <div className="flex items-center gap-3">
                  <Image
                    src="/images/carebridge-logo.png"
                    alt="CareBridge"
                    width={48}
                    height={48}
                    className="h-11 w-11 rounded-[10px] object-contain"
                  />
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                      Making Healthcare Easier to Reach
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{BRAND.name}</div>
                  </div>
                </div>
                <div className="mt-3 max-w-xs text-sm leading-6 muted">{BRAND.shortDescription}</div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/providers" className="btn-secondary px-4 py-2 text-sm">
                    Find care
                  </Link>
                  <Link href="/providers/join" className="btn-primary px-4 py-2 text-sm">
                    Provider entry
                  </Link>
                </div>
              </div>

              {FOOTER_COLUMNS.map((column) => (
                <div key={column.heading}>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    {column.heading}
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    {column.links.map((link) => (
                      <div key={link.href}>
                        <Link href={link.href} className="muted transition-colors hover:text-[var(--foreground)]">
                          {link.label}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 border-t border-[var(--border)] pt-5 text-sm muted">
              Public resources remain open to browse. Patient, provider, and admin workspaces stay protected inside secure CareBridge portals.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
