"use client";

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

export default function SiteChrome({ children, isAuthenticated, userEmail }: SiteChromeProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.88),_transparent_68%)]" />

      <header className="sticky top-0 z-40">
        <div
          className={`transition-all duration-200 ${
            scrolled
              ? "border-b border-[var(--border)] bg-[rgba(248,244,236,0.94)] shadow-[0_18px_40px_rgba(64,53,33,0.14)] backdrop-blur-xl"
              : "bg-[rgba(248,244,236,0.92)]"
          }`}
        >
          <div className="shell py-4 sm:py-5">
            <Link href="/" className="flex flex-col items-center text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                {BRAND.tagline}
              </span>
              <span className="mt-2 text-4xl font-semibold sm:text-5xl">{BRAND.name}</span>
            </Link>
          </div>
        </div>

        <div className="shell pb-2 pt-3">
          <nav
            aria-label="Primary"
            className={`panel px-5 py-4 transition-all duration-200 sm:px-6 ${
              scrolled ? "bg-[rgba(255,252,246,0.94)] shadow-[0_18px_40px_rgba(64,53,33,0.12)]" : "bg-[rgba(255,252,246,0.88)]"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="hidden items-center gap-1 text-sm lg:flex">
                {PUBLIC_NAV_LINKS.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`rounded-full px-4 py-2 outline-none hover:bg-white/70 hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                        active ? "bg-white/80 text-[var(--accent-strong)] shadow-[inset_0_-2px_0_var(--accent)]" : ""
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <div className="hidden items-center gap-3 lg:flex">
                {isAuthenticated ? (
                  <>
                    <Link href="/portal" className="btn-primary">
                      Open portal
                    </Link>
                    <SignOutButton />
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="rounded-full px-4 py-2 text-sm font-semibold outline-none hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      Sign in
                    </Link>
                    <Link href="/signup" className="btn-primary shadow-[0_12px_24px_rgba(31,77,57,0.18)]">
                      Get started
                    </Link>
                  </>
                )}
              </div>

              <div className="flex w-full items-center justify-between gap-3 lg:hidden">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  Patient and provider access
                </div>
                <button
                  type="button"
                  aria-expanded={menuOpen}
                  aria-controls="mobile-site-menu"
                  aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                  onClick={() => setMenuOpen((open) => !open)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-white/72 outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <span className="sr-only">Toggle navigation</span>
                  <span className="flex w-5 flex-col gap-1.5">
                    <span className={`block h-0.5 rounded-full bg-[var(--foreground)] transition-transform duration-200 ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
                    <span className={`block h-0.5 rounded-full bg-[var(--foreground)] transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`} />
                    <span className={`block h-0.5 rounded-full bg-[var(--foreground)] transition-transform duration-200 ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
                  </span>
                </button>
              </div>
            </div>

            <div
              id="mobile-site-menu"
              className={`overflow-hidden transition-all duration-200 lg:hidden ${
                menuOpen ? "mt-4 max-h-[520px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="space-y-2 border-t border-[var(--border)] pt-4">
                <div className="grid gap-2">
                  {PUBLIC_NAV_LINKS.map((link) => {
                    const active = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={`rounded-2xl px-4 py-3 text-sm font-medium outline-none hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                          active ? "bg-white/80 text-[var(--accent-strong)]" : ""
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  {isAuthenticated ? (
                    <>
                      <Link href="/portal" onClick={() => setMenuOpen(false)} className="btn-primary">
                        Open portal
                      </Link>
                      {userEmail ? <div className="rounded-2xl bg-white/72 px-4 py-3 text-sm muted">{userEmail}</div> : null}
                      <SignOutButton />
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-full px-4 py-3 text-sm font-semibold text-center outline-none hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                        Sign in
                      </Link>
                      <Link href="/signup" onClick={() => setMenuOpen(false)} className="btn-primary">
                        Get started
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </nav>
        </div>
      </header>

      <main className="pb-16">{children}</main>

      <footer className="shell pb-10">
        <div className="panel flex flex-col gap-4 px-6 py-6 text-sm muted sm:flex-row sm:items-center sm:justify-between">
          <div>{BRAND.shortDescription}</div>
          <div className="flex flex-wrap gap-4">
            <Link href="/resources">Resources</Link>
            <Link href="/providers">Providers</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
