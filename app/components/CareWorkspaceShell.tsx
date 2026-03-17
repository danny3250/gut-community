"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/app/components/SignOutButton";
import { BRAND } from "@/lib/config/brand";

type WorkspaceLink = {
  href: string;
  label: string;
  badgeCount?: number;
};

type CareWorkspaceShellProps = {
  areaLabel: string;
  title: string;
  description: string;
  email: string | null;
  primaryLinks: WorkspaceLink[];
  secondaryLinks?: WorkspaceLink[];
  children: React.ReactNode;
};

export default function CareWorkspaceShell({
  areaLabel,
  title,
  description,
  email,
  primaryLinks,
  secondaryLinks = [],
  children,
}: CareWorkspaceShellProps) {
  const pathname = usePathname();

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-[360px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_transparent_72%)]" />
      <div className="shell py-5 sm:py-6">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[30px] border border-[var(--border)] bg-[rgba(255,252,246,0.9)] px-5 py-5 shadow-[0_22px_46px_rgba(97,84,58,0.08)]">
            <Link href="/" className="block rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                {areaLabel}
              </div>
              <div className="mt-2 text-2xl font-semibold">{BRAND.name}</div>
              <div className="mt-1 text-sm muted">{BRAND.tagline}</div>
            </Link>

            <div className="mt-6">
              <div className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Workspace navigation
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {primaryLinks.map((link) => {
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
                    <span className="flex items-center justify-between gap-3">
                      <span>{link.label}</span>
                      {link.badgeCount && link.badgeCount > 0 ? (
                        <span
                          className={
                            active
                              ? "rounded-full bg-white/18 px-2 py-0.5 text-xs font-semibold text-white"
                              : "rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-strong)]"
                          }
                        >
                          {link.badgeCount > 99 ? "99+" : link.badgeCount}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
            </div>

            {secondaryLinks.length > 0 ? (
              <div className="mt-8 border-t border-[var(--border)] pt-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                  Public resources
                </div>
                <div className="mt-3 space-y-2">
                  {secondaryLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="block rounded-2xl px-4 py-3 text-sm hover:bg-white/70">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          <div className="space-y-5">
            <header className="rounded-[30px] border border-[var(--border)] bg-[rgba(255,252,246,0.9)] px-5 py-6 shadow-[0_22px_46px_rgba(97,84,58,0.08)] sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    {areaLabel}
                  </div>
                  <div className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">{title}</div>
                  <div className="mt-2 max-w-2xl text-sm leading-6 muted">{description}</div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {email ? <span className="rounded-full bg-white/70 px-4 py-2 text-sm muted">{email}</span> : null}
                  <SignOutButton />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {primaryLinks.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={`header-${link.href}`}
                      href={link.href}
                      className={
                        active
                          ? "rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                          : "rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm text-[rgba(43,36,28,0.82)]"
                      }
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </header>

            <main className="space-y-5">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
