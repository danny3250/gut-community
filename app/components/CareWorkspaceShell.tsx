"use client";

import Image from "next/image";
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
  showHeaderNavigation?: boolean;
  variant?: "default" | "admin";
  children: React.ReactNode;
};

export default function CareWorkspaceShell({
  areaLabel,
  title,
  description,
  email,
  primaryLinks,
  secondaryLinks = [],
  showHeaderNavigation = true,
  variant = "default",
  children,
}: CareWorkspaceShellProps) {
  const pathname = usePathname();
  const activePrimaryLink = primaryLinks.find((link) => isWorkspaceLinkActive(pathname, link.href));
  const isAdminVariant = variant === "admin";

  return (
    <div className={isAdminVariant ? "min-h-screen bg-[#f6f7f9]" : "relative"}>
      {isAdminVariant ? null : <div className="absolute inset-x-0 top-0 -z-10 h-[320px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_transparent_72%)]" />}
      <div className={`shell ${isAdminVariant ? "py-4 sm:py-5" : "py-5 sm:py-6"}`}>
        <div className={`grid ${isAdminVariant ? "gap-5 lg:grid-cols-[240px_minmax(0,1fr)]" : "gap-6 lg:grid-cols-[260px_minmax(0,1fr)]"}`}>
          <aside className={isAdminVariant ? "h-fit rounded-[16px] border border-[#e5e7eb] bg-white px-3 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)]" : "h-fit rounded-[16px] border border-[var(--border)] bg-[rgba(255,252,246,0.88)] px-4 py-4 shadow-[0_12px_28px_rgba(97,84,58,0.06)]"}>
            <Link href="/" className={isAdminVariant ? "block rounded-[12px] border border-[#edf0f3] bg-[#fafbfc] px-4 py-3" : "block rounded-[12px] border border-[var(--border)] bg-white/76 px-4 py-4"}>
              <div className="flex items-center gap-3">
                <Image
                  src="/images/carebridge-logo.png"
                  alt="CareBridge"
                  width={44}
                  height={44}
                  className="h-10 w-10 rounded-[10px] object-contain"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                    {areaLabel}
                  </div>
                  <div className="mt-1 text-xl font-semibold">{BRAND.name}</div>
                </div>
              </div>
              <div className="mt-3 text-sm muted">
                {isAdminVariant ? "Admin workspace" : "Making Healthcare Easier to Reach"}
              </div>
            </Link>

            <div className={isAdminVariant ? "mt-4" : "mt-5"}>
              <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                Workspace navigation
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              {primaryLinks.map((link) => {
                const active = isWorkspaceLinkActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={
                      active
                        ? isAdminVariant
                          ? "block rounded-[12px] bg-[#1f2937] px-4 py-2.5 text-sm font-semibold text-white"
                          : "block rounded-[12px] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(31,77,57,0.14)]"
                        : isAdminVariant
                          ? "block rounded-[12px] px-4 py-2.5 text-sm text-slate-700 hover:bg-[#f4f6f8]"
                          : "block rounded-[12px] px-4 py-2.5 text-sm text-[rgba(43,36,28,0.82)] hover:bg-white/70"
                    }
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span>{link.label}</span>
                      {link.badgeCount && link.badgeCount > 0 ? (
                        <span
                          className={
                            active
                              ? "rounded-[10px] bg-white/18 px-2 py-0.5 text-xs font-semibold text-white"
                              : isAdminVariant
                                ? "rounded-[10px] bg-[#eef2f7] px-2 py-0.5 text-xs font-semibold text-slate-700"
                                : "rounded-[10px] bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-strong)]"
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
              <div className={`mt-6 border-t pt-4 ${isAdminVariant ? "border-[#edf0f3]" : "border-[var(--border)]"}`}>
                <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)] opacity-80">
                  Public resources
                </div>
                <div className="mt-2 space-y-1.5">
                  {secondaryLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={isAdminVariant ? "block rounded-[12px] px-4 py-2.5 text-sm text-slate-500 hover:bg-[#f4f6f8]" : "block rounded-[12px] px-4 py-2.5 text-sm text-[rgba(43,36,28,0.72)] hover:bg-white/70"}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          <div className={isAdminVariant ? "space-y-6" : "space-y-7"}>
            <header className={isAdminVariant ? "flex flex-col gap-3 border-b border-[#e5e7eb] px-1 pb-4 sm:flex-row sm:items-center sm:justify-between" : "border-b border-[var(--border)] px-1 pb-5"}>
              <div className={isAdminVariant ? "min-w-0" : "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"}>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    {activePrimaryLink?.label ?? areaLabel}
                  </div>
                  {!isAdminVariant ? (
                    <div className="hero-tagline mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                      Making Healthcare Easier to Reach
                    </div>
                  ) : null}
                  <div className={isAdminVariant ? "mt-1 text-2xl font-semibold tracking-[-0.02em] text-[var(--foreground)]" : "hero-wordmark mt-2 text-3xl font-semibold tracking-[-0.02em] text-[var(--foreground)]"}>
                    {title}
                  </div>
                  <div className={isAdminVariant ? "mt-1 max-w-2xl text-sm leading-5 text-slate-500" : "mt-2 max-w-2xl text-sm leading-6 muted"}>
                    {description}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {email ? (
                  <div className={isAdminVariant ? "rounded-[14px] border border-[#e5e7eb] bg-[#fafbfc] px-3.5 py-2 text-sm text-slate-700" : "rounded-[14px] border border-[var(--border)] bg-white/78 px-4 py-2 text-sm"}>
                    <span className="font-medium text-[var(--foreground)]">{email}</span>
                  </div>
                ) : null}
                <SignOutButton />
              </div>

              {!showHeaderNavigation && !isAdminVariant ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm muted">
                  <span className="rounded-[12px] border border-[var(--border)] bg-white/72 px-3 py-1.5">
                    {areaLabel}
                  </span>
                  {activePrimaryLink ? <span>Current section: {activePrimaryLink.label}</span> : null}
                </div>
              ) : showHeaderNavigation ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {primaryLinks.map((link) => {
                    const active = isWorkspaceLinkActive(pathname, link.href);
                    return (
                      <Link
                        key={`header-${link.href}`}
                        href={link.href}
                        className={
                          active
                            ? "rounded-[12px] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                            : "rounded-[12px] border border-[var(--border)] bg-white/70 px-4 py-2 text-sm text-[rgba(43,36,28,0.82)]"
                        }
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </header>

            <main className={isAdminVariant ? "space-y-6" : "space-y-7"}>{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}

function isWorkspaceLinkActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/admin" || href === "/portal" || href === "/provider") return false;
  return pathname.startsWith(`${href}/`);
}
