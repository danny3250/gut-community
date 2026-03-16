import Link from "next/link";

type PublicInfoPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
};

export default function PublicInfoPage({
  eyebrow,
  title,
  description,
  bullets,
  ctaLabel,
  ctaHref,
}: PublicInfoPageProps) {
  return (
    <main className="shell space-y-8 py-6 sm:py-10">
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="section-title">{title}</h1>
          <p className="max-w-2xl text-base leading-7 muted">{description}</p>
          <Link href={ctaHref} className="btn-primary">
            {ctaLabel}
          </Link>
        </div>

        <div className="panel-strong px-6 py-6">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            What to expect
          </div>
          <ul className="mt-4 space-y-4 text-sm leading-6 muted">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
