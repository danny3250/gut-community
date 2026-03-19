import Link from "next/link";
import PublicBrandMark from "@/app/components/PublicBrandMark";
import { BRAND } from "@/lib/config/brand";

const principles = [
  "Public education and trusted resources should stay easy to access.",
  "Protected patient, provider, and admin workflows should stay clearly separated.",
  "The product should reduce friction around care, not add another confusing portal layer.",
];

export default function AboutPage() {
  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <PublicBrandMark />
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">About {BRAND.name}</span>
          <h1 className="section-title">A healthcare access platform built to make the path to care feel simpler.</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            {BRAND.name} is designed for patients who need easier access to information, providers, appointments,
            and remote care, and for providers who want cleaner ways to reach patients without unnecessary operational friction.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/services" className="btn-primary">Explore services</Link>
            <Link href="/providers" className="btn-secondary">Browse providers</Link>
          </div>
        </div>
        <div className="panel-strong px-6 py-6">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">What guides the product</div>
          <ul className="mt-4 space-y-4 text-sm leading-6 muted">
            {principles.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>
    </main>
  );
}
