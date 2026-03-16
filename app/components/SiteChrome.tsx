"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SignOutButton from "@/app/components/SignOutButton";

type SiteChromeProps = {
  children: React.ReactNode;
  isAuthenticated: boolean;
  userEmail: string | null;
};

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/recipes", label: "Recipes" },
  { href: "/news", label: "News" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const appLinks = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/check-in", label: "Daily gut check" },
  { href: "/app/history", label: "History" },
  { href: "/app/analysis", label: "Analysis" },
  { href: "/app/settings", label: "Settings" },
];

const supportLinks = [
  { href: "/recipes", label: "Recipes" },
  { href: "/forum", label: "Forum" },
];

export default function SiteChrome({
  children,
  isAuthenticated,
  userEmail,
}: SiteChromeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAppRoute = pathname.startsWith("/app");
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

  function handleMobileNav(href: string) {
    setMenuOpen(false);
    router.push(href);
  }

  if (isAppRoute) {
    return (
      <div className="relative">
        <div className="absolute inset-x-0 top-0 -z-10 h-[360px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_transparent_72%)]" />
        <div className="shell py-5 sm:py-6">
          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="panel h-fit px-5 py-5">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-lg font-semibold text-[var(--accent-strong)]">
                  WE
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                    Well Emboweled
                  </div>
                  <div className="text-sm muted">Member app</div>
                </div>
              </Link>

              <div className="mt-6 space-y-2">
                {appLinks.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={
                        active
                          ? "block rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
                          : "block rounded-2xl px-4 py-3 text-sm hover:bg-white/70"
                      }
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-8 border-t border-[var(--border)] pt-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  Supportive extras
                </div>
                <div className="mt-3 space-y-2">
                  {supportLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block rounded-2xl px-4 py-3 text-sm hover:bg-white/70"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </aside>

            <div className="space-y-5">
              <header className="panel flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    Private member area
                  </div>
                  <div className="mt-1 text-sm muted">
                    Tracking, insight, reflection, and action without extra friction.
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {userEmail && (
                    <span className="rounded-full bg-white/70 px-4 py-2 text-sm muted">
                      {userEmail}
                    </span>
                  )}
                  <SignOutButton />
                </div>
              </header>

              <main className="space-y-5">{children}</main>
            </div>
          </div>
        </div>
      </div>
    );
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
          <div className="shell flex justify-center py-3 sm:py-4">
            <Link href="/" className="inline-flex items-center justify-center">
              <Image
                src="/images/hero/well-emboweled-logo.png"
                alt="Well Emboweled"
                width={1536}
                height={512}
                priority
                className="h-auto w-auto max-h-[92px] max-w-[380px] object-contain sm:max-h-[118px] sm:max-w-[520px] lg:max-h-[146px] lg:max-w-[680px]"
              />
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
                {publicLinks.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`rounded-full px-4 py-2 outline-none hover:bg-white/70 hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                        active
                          ? "bg-white/80 text-[var(--accent-strong)] shadow-[inset_0_-2px_0_var(--accent)]"
                          : ""
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
                    <Link href="/app" className="btn-primary">
                      Dashboard
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
                      Join members
                    </Link>
                  </>
                )}
              </div>

              <div className="flex w-full items-center justify-between gap-3 lg:hidden">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  Public site and member app
                </div>
                <div className="flex items-center gap-2">
                  {!isAuthenticated && (
                    <Link href="/signup" className="btn-primary px-4 py-2 text-sm">
                      Join
                    </Link>
                  )}
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
                      <span
                        className={`block h-0.5 rounded-full bg-[var(--foreground)] transition-transform duration-200 ${
                          menuOpen ? "translate-y-2 rotate-45" : ""
                        }`}
                      />
                      <span
                        className={`block h-0.5 rounded-full bg-[var(--foreground)] transition-opacity duration-200 ${
                          menuOpen ? "opacity-0" : ""
                        }`}
                      />
                      <span
                        className={`block h-0.5 rounded-full bg-[var(--foreground)] transition-transform duration-200 ${
                          menuOpen ? "-translate-y-2 -rotate-45" : ""
                        }`}
                      />
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div
              id="mobile-site-menu"
              className={`overflow-hidden transition-all duration-200 lg:hidden ${
                menuOpen ? "mt-4 max-h-[420px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="space-y-2 border-t border-[var(--border)] pt-4">
                <div className="grid gap-2">
                  {publicLinks.map((link) => {
                    const active = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={(event) => {
                          event.preventDefault();
                          handleMobileNav(link.href);
                        }}
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
                      <Link href="/app" className="btn-primary">
                        Dashboard
                      </Link>
                      <SignOutButton />
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={(event) => {
                          event.preventDefault();
                          handleMobileNav("/login");
                        }}
                        className="rounded-full px-4 py-3 text-sm font-semibold text-center outline-none hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      >
                        Sign in
                      </Link>
                      <Link
                        href="/signup"
                        onClick={(event) => {
                          event.preventDefault();
                          handleMobileNav("/signup");
                        }}
                        className="btn-primary"
                      >
                        Join members
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
          <div>
            Thoughtful gut health education, member reflection tools, and supportive content without
            hype.
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/resources">Resources</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
