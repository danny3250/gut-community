import Link from "next/link";

const resourceLinks = [
  {
    title: "Public resource center",
    body: "Review patient-facing education, care preparation materials, and supportive wellness content.",
    href: "/resources",
  },
  {
    title: "Provider community questions",
    body: "Move into the provider community workspace to answer health questions in your scope.",
    href: "/provider/community",
  },
  {
    title: "Directory profile",
    body: "See how your approved provider profile appears to patients browsing CareBridge.",
    href: "/providers",
  },
];

export default function ProviderResourcesPage() {
  return (
    <section className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Provider resources</div>
        <h1 className="mt-3 text-3xl font-semibold">Care delivery support and patient-facing resources</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          Keep educational materials, public resource links, and provider-guided community tools close to the rest of
          your CareBridge workspace.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {resourceLinks.map((link) => (
          <Link key={link.href} href={link.href} className="panel block px-5 py-5 hover:-translate-y-0.5">
            <div className="text-xl font-semibold">{link.title}</div>
            <p className="mt-2 text-sm leading-6 muted">{link.body}</p>
          </Link>
        ))}
      </section>
    </section>
  );
}
