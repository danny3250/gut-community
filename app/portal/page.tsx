import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/session";
import { getRecommendedRecipesForUser } from "@/lib/carebridge/recommendations";

const quickActions = [
  {
    title: "Daily check-in",
    description: "Log how you feel, symptoms, foods, sleep, and stress in under a minute.",
    href: "/portal/check-in",
  },
  {
    title: "Book care",
    description: "Find a provider and request a telehealth or follow-up visit without extra phone tag.",
    href: "/providers",
  },
  {
    title: "Recipes",
    description: "See recipe suggestions shaped by your recent check-ins and browse the full recipe library.",
    href: "/portal/recipes",
  },
  {
    title: "Messages",
    description: "Keep communication, reminders, and follow-ups in one private place.",
    href: "/portal/messages",
  },
  {
    title: "Forms and documents",
    description: "Complete intake details and keep shared paperwork close to the appointment workflow.",
    href: "/portal/forms",
  },
];

export default async function PortalDashboardPage() {
  const { displayName, user } = await getCurrentUserWithRole();
  const firstName = displayName?.split(" ")[0] || "there";
  const recommendedRecipes = user ? await getRecommendedRecipesForUser(user.id, 3) : [];

  return (
    <>
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">Patient dashboard</span>
          <h1 className="section-title">Welcome back, {firstName}.</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            CareBridge is designed to make healthcare easier to reach by keeping scheduling, visit access,
            forms, resources, and community support connected in one calmer place.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/portal/check-in" className="btn-primary">
              Daily check-in
            </Link>
            <Link href="/portal/recipes" className="btn-secondary">
              Recommended recipes
            </Link>
            <Link href="/portal/appointments" className="btn-primary">
              View appointments
            </Link>
            <Link href="/providers" className="btn-secondary">
              Find a provider
            </Link>
          </div>
        </div>

        <div className="panel-strong grid gap-4 px-5 py-5 sm:grid-cols-2">
          <MiniCard title="Upcoming visits" body="Telehealth and follow-up appointments in one timeline." />
          <MiniCard title="Daily health check" body="Track symptoms, foods, sleep, and stress without a long form." />
          <MiniCard title="Recipe support" body="Use recent check-ins to surface practical meal ideas that feel easier to act on." />
          <MiniCard title="Intake ready" body="Complete forms before visits to reduce check-in friction." />
          <MiniCard title="Resources" body="Return to trustworthy educational content and supportive wellness tools." />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {quickActions.map((item) => (
          <Link key={item.href} href={item.href} className="panel block px-5 py-5 hover:-translate-y-0.5">
            <div className="text-xl font-semibold">{item.title}</div>
            <p className="mt-2 text-sm leading-6 muted">{item.description}</p>
          </Link>
        ))}
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="eyebrow">Recommended for You</span>
            <h2 className="mt-3 text-2xl font-semibold">Recipes shaped by your health signals.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 muted">
              These suggestions use recent check-ins and visit guidance to surface practical meal ideas without extra busywork.
            </p>
          </div>
          <Link href="/portal/recipes" className="btn-secondary">
            View all recommendations
          </Link>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {recommendedRecipes.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5 lg:col-span-3">
              <h3 className="text-lg font-semibold">Start logging your daily health to get personalized recommendations.</h3>
              <p className="mt-2 text-sm leading-6 muted">
                As CareBridge learns from your check-ins and visit guidance, this section will suggest recipes that better fit your needs.
              </p>
            </div>
          ) : (
            recommendedRecipes.map((recipe) => (
              <Link key={recipe.id} href={`/recipes/${recipe.slug}`} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5 hover:-translate-y-0.5">
                <div className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                  {recipe.recommendation_reason}
                </div>
                <div className="mt-3 text-xl font-semibold">{recipe.title}</div>
                {recipe.summary ? <p className="mt-2 text-sm leading-6 muted">{recipe.summary}</p> : null}
                {recipe.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recipe.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                        {formatFacet(tag)}
                      </span>
                    ))}
                  </div>
                ) : null}
                {recipe.why_this_helps ? <p className="mt-3 text-sm leading-6 muted">{recipe.why_this_helps}</p> : null}
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="panel px-6 py-6">
          <h2 className="text-2xl font-semibold">What CareBridge is building toward</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StepCard step="1" title="Schedule care" body="Browse providers, pick a slot, and confirm with less back-and-forth." />
            <StepCard step="2" title="Prepare securely" body="Complete intake and consent steps before the visit begins." />
            <StepCard step="3" title="Join remotely" body="Use telehealth workflows that are ready for a future video vendor integration." />
          </div>
        </div>

        <div className="panel px-6 py-6">
          <h2 className="text-2xl font-semibold">Support beyond the visit</h2>
          <p className="mt-3 text-sm leading-6 muted">
            Recipes, educational resources, and community participation remain part of the platform as
            supportive content around care access, not as replacements for clinical guidance.
          </p>
        </div>
      </section>
    </>
  );
}

function formatFacet(value: string) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function MiniCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--accent-soft)]/55 px-4 py-4">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{title}</div>
      <div className="mt-2 text-sm leading-6 muted">{body}</div>
    </div>
  );
}

function StepCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Step {step}</div>
      <div className="mt-2 text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm leading-6 muted">{body}</div>
    </div>
  );
}
