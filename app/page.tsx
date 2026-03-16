import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const publicFeatures = [
  {
    title: "Recipes",
    description: "Symptom-friendly meals, practical tags, and calmer ideas for everyday eating.",
    href: "/recipes",
    cta: "Explore recipes",
  },
  {
    title: "Articles and news",
    description: "Clear, useful gut health education without content-farm clutter or hype.",
    href: "/news",
    cta: "Read articles",
  },
  {
    title: "Resources",
    description: "Helpful guides, references, and support materials people can actually return to.",
    href: "/resources",
    cta: "Open resources",
  },
];

const memberFeatures = [
  {
    label: "Dashboard",
    body: "A private home for reflection, saved progress, and your next best step.",
  },
  {
    label: "Daily gut check",
    body: "A fast daily check-in designed to take seconds, not turn into a burden.",
  },
  {
    label: "History",
    body: "A clear view of how things have been going, even with imperfect data.",
  },
  {
    label: "Insights",
    body: "Gentle pattern summaries and future-ready recommendations without overclaiming.",
  },
];

const appPreview = [
  {
    title: "How did your gut feel today?",
    detail: "Fine, Meh, or Rough with lightweight symptom follow-ups only when needed.",
    tone: "Daily check-in",
  },
  {
    title: "Recent pattern view",
    detail: "A calmer history of better and tougher days with simple context, not overwhelming logs.",
    tone: "History",
  },
  {
    title: "Worth testing gently",
    detail: "Safe, explainable insights that suggest possible factors without pretending to diagnose.",
    tone: "Insights",
  },
];

const philosophy = [
  "Practical support without overwhelm.",
  "Structure without guilt or pressure.",
  "Trusted guidance without pretending to be a clinic.",
];

const featuredRecipes = [
  {
    title: "Gentle Ginger Rice Bowl",
    meta: "Dairy-free, lower spice, easy to come back to on a rougher day.",
  },
  {
    title: "Soft Scramble Breakfast Plate",
    meta: "Simple protein-forward breakfast with low-friction prep.",
  },
  {
    title: "Herbed Chicken and Carrots",
    meta: "Comforting, practical dinner built for repeatability.",
  },
];

const featuredArticles = [
  {
    title: "How to notice patterns without tracking everything",
    meta: "A calmer approach to daily gut awareness.",
  },
  {
    title: "When symptom-friendly meals need to stay simple",
    meta: "Practical cooking support instead of perfectionism.",
  },
];

const featuredResources = [
  {
    title: "Starter guide to gentle logging",
    meta: "A friendly explanation of what to track and what to skip.",
  },
  {
    title: "Questions to bring to a healthcare visit",
    meta: "Supportive preparation without acting like medical advice.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const primaryHref = user ? "/app" : "/signup";
  const primaryLabel = user ? "Open member app" : "Join members";
  const secondaryHref = "/recipes";
  const secondaryLabel = "Explore recipes";

  return (
    <main className="shell space-y-10 py-6 sm:space-y-12 sm:py-10">
      <section className="panel grid gap-8 overflow-hidden px-6 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-12">
        <div className="space-y-6">
          <span className="eyebrow">Public website and private member app</span>

          <div className="space-y-4">
            <h1 className="section-title max-w-4xl">
              A calmer, more useful home for gut health support.
            </h1>
            <p className="max-w-2xl text-base leading-7 muted sm:text-lg">
              Well Emboweled brings together practical recipes, clear education, trusted resources, and a
              private member experience for tracking patterns, reflecting on symptoms, and building
              better habits over time.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={primaryHref} className="btn-primary">
              {primaryLabel}
            </Link>
            <Link href={secondaryHref} className="btn-secondary">
              {secondaryLabel}
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <HeroStat title="Public content" body="Recipes, articles, and resources available before login." />
            <HeroStat title="Member tools" body="Daily gut checks, history, and private progress over time." />
            <HeroStat title="Tone" body="Supportive, modern, and trustworthy without wellness hype." />
          </div>
        </div>

        <div className="panel-strong grid gap-4 px-6 py-6">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--accent-soft)]/45 px-5 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Public experience
            </div>
            <div className="mt-3 text-2xl font-semibold">Learn, browse, and get oriented</div>
            <p className="mt-2 text-sm leading-6 muted">
              Start with recipes, useful reading, and practical resources that feel thoughtful rather than
              generic.
            </p>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-white/78 px-5 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Member experience
            </div>
            <div className="mt-3 text-2xl font-semibold">Track, reflect, and build insight</div>
            <p className="mt-2 text-sm leading-6 muted">
              Behind login, the app helps members check in quickly, notice patterns, save useful content,
              and come back to their progress without pressure.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="panel px-6 py-6 sm:px-8">
          <span className="eyebrow">What&apos;s public</span>
          <h2 className="mt-4 text-3xl font-semibold">Useful before you ever create an account</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 muted">
            The public site is meant for trust, clarity, and helpful discovery. Visitors should be able to
            learn what Well Emboweled offers and find something genuinely useful right away.
          </p>

          <div className="mt-6 grid gap-4">
            {publicFeatures.map((feature) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                href={feature.href}
                cta={feature.cta}
              />
            ))}
          </div>
        </div>

        <div className="panel px-6 py-6 sm:px-8">
          <span className="eyebrow">What members unlock</span>
          <h2 className="mt-4 text-3xl font-semibold">A private space for daily support and personal progress</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 muted">
            The member app is where Well Emboweled becomes more structured: low-burden check-ins, saved
            progress, gentle insight, and future-ready recommendations.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {memberFeatures.map((feature) => (
              <MemberCard key={feature.label} label={feature.label} body={feature.body} />
            ))}
          </div>
        </div>
      </section>

      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1fr_1.05fr]">
        <div className="space-y-4">
          <span className="eyebrow">Member app preview</span>
          <h2 className="text-3xl font-semibold">A calmer app behind the website</h2>
          <p className="max-w-2xl text-sm leading-6 muted">
            The private side is designed to feel guided and supportive, not like a finance dashboard and
            not like a demanding health tracker. It should help people notice patterns without creating a
            second job.
          </p>
          <div className="rounded-[24px] bg-[var(--warm)]/55 p-5 text-sm leading-6 muted">
            The core flow is simple: check in, review what has been happening, and get gentle insight that
            helps you decide what to test next.
          </div>
        </div>

        <div className="grid gap-4">
          {appPreview.map((item) => (
            <div
              key={item.title}
              className="rounded-[24px] border border-[var(--border)] bg-white/76 px-5 py-5 shadow-[0_14px_34px_rgba(64,53,33,0.07)]"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                {item.tone}
              </div>
              <div className="mt-2 text-xl font-semibold">{item.title}</div>
              <p className="mt-2 text-sm leading-6 muted">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="panel px-6 py-6 sm:px-8">
          <span className="eyebrow">Why it feels different</span>
          <h2 className="mt-4 text-3xl font-semibold">Helpful structure without pressure</h2>
          <div className="mt-4 space-y-4">
            {philosophy.map((item) => (
              <div
                key={item}
                className="rounded-[22px] border border-[var(--border)] bg-white/68 px-4 py-4 text-sm leading-6 muted"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="panel px-6 py-6 sm:px-8">
          <span className="eyebrow">Featured content</span>
          <h2 className="mt-4 text-3xl font-semibold">Recipes, reading, and useful next steps</h2>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <PreviewColumn title="Featured recipes" items={featuredRecipes} href="/recipes" cta="See all recipes" />
            <PreviewColumn title="Recent articles" items={featuredArticles} href="/news" cta="Read more" />
            <PreviewColumn title="Useful resources" items={featuredResources} href="/resources" cta="Browse resources" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="panel px-6 py-6 sm:px-8">
          <span className="eyebrow">Community preview</span>
          <h2 className="mt-4 text-3xl font-semibold">A moderated space for shared support</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 muted">
            The forum is there for practical conversation, shared experience, and feeling less alone. It
            should support the overall product, not dominate it, and it should never be framed as medical
            advice.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <CommunityCard
              title="Shared experience"
              body="Questions, routines, and everyday wins from people navigating similar patterns."
            />
            <CommunityCard
              title="Calm moderation"
              body="A more intentional tone that keeps discussion supportive and grounded."
            />
          </div>

          <div className="mt-6">
            <Link href="/forum" className="btn-secondary">
              Visit the forum
            </Link>
          </div>
        </div>

        <div className="panel-strong px-6 py-6 sm:px-8">
          <span className="eyebrow">Next step</span>
          <h2 className="mt-4 text-3xl font-semibold">Start with what feels most useful today</h2>
          <p className="mt-3 text-sm leading-6 muted">
            Browse recipes and resources publicly, or create an account to start using the private member
            tools as they continue to grow.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={primaryHref} className="btn-primary">
              {primaryLabel}
            </Link>
            <Link href="/login" className="btn-secondary">
              Sign in
            </Link>
          </div>

          <div className="mt-6 rounded-[24px] bg-[var(--accent-soft)]/45 p-5 text-sm leading-6 muted">
            Well Emboweled is being built to help people understand patterns, reflect without judgment, and
            take smaller, steadier next steps.
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroStat({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/55 px-4 py-4">
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm leading-6 muted">{body}</div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <Link href={href} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5 hover:-translate-y-0.5">
      <div className="text-xl font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-6 muted">{description}</p>
      <div className="mt-4 text-sm font-semibold text-[var(--accent-strong)]">{cta}</div>
    </Link>
  );
}

function MemberCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--accent-soft)]/38 px-4 py-4">
      <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 muted">{body}</p>
    </div>
  );
}

function PreviewColumn({
  title,
  items,
  href,
  cta,
}: {
  title: string;
  items: { title: string; meta: string }[];
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-[18px] bg-[var(--background)]/65 px-4 py-4">
            <div className="font-medium">{item.title}</div>
            <div className="mt-1 text-sm leading-6 muted">{item.meta}</div>
          </div>
        ))}
      </div>
      <Link href={href} className="mt-4 inline-flex text-sm font-semibold text-[var(--accent-strong)]">
        {cta}
      </Link>
    </div>
  );
}

function CommunityCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm leading-6 muted">{body}</div>
    </div>
  );
}
