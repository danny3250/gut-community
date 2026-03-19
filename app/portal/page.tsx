import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fetchRecentPublishedFollowUpsForPatient } from "@/lib/carebridge/follow-ups";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";
import { getRecommendedRecipesForUser } from "@/lib/carebridge/recommendations";
import { getPatientProviders } from "@/lib/carebridge/relationships";

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
  const supabase = user ? await createClient() : null;
  const patient = user && supabase ? await fetchPatientByUserId(supabase, user.id) : null;
  const [recommendedRecipes, providerRelationships, recentFollowUps] = await Promise.all([
    user ? getRecommendedRecipesForUser(user.id, 3) : Promise.resolve([]),
    patient && supabase ? getPatientProviders(supabase, patient.id, 4) : Promise.resolve([]),
    patient && supabase ? fetchRecentPublishedFollowUpsForPatient(supabase, patient.id, 3) : Promise.resolve([]),
  ]);

  return (
    <>
      <section className="section-shell grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
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

        <div className="grid gap-3 sm:grid-cols-2">
          <MiniCard title="Upcoming visits" body="Telehealth and follow-up appointments in one timeline." />
          <MiniCard title="Daily health check" body="Track symptoms, foods, sleep, and stress without a long form." />
          <MiniCard title="Recipe support" body="Use recent check-ins to surface practical meal ideas that feel easier to act on." />
          <MiniCard title="Intake ready" body="Complete forms before visits to reduce check-in friction." />
          <MiniCard title="Resources" body="Return to trustworthy educational content and supportive wellness tools." />
        </div>
      </section>

      <section className="workspace-section">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold">Quick actions</div>
            <p className="mt-2 text-sm leading-6 muted">Move between the most common patient tasks without hunting through menus.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        {quickActions.map((item) => (
          <Link key={item.href} href={item.href} className="inline-panel block px-5 py-4 hover:-translate-y-0.5">
            <div className="text-lg font-semibold">{item.title}</div>
            <p className="mt-2 text-sm leading-6 muted">{item.description}</p>
          </Link>
        ))}
      </section>

      <section className="workspace-section">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="eyebrow">Your providers</span>
            <h2 className="mt-3 text-2xl font-semibold">Keep continuity close by.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 muted">
              Recent and favorite providers appear here as your care relationships grow through appointments.
            </p>
          </div>
          <Link href="/providers" className="btn-secondary">
            Browse providers
          </Link>
        </div>

        {providerRelationships.length === 0 ? (
          <div className="mt-5 inline-panel px-5 py-5">
            <h3 className="text-lg font-semibold">You have not connected with any providers yet.</h3>
            <p className="mt-2 text-sm leading-6 muted">
              Book an appointment to start building your provider list and make rebooking easier later on.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            {providerRelationships.map((relationship) => (
              <Link
                key={relationship.id}
                href={relationship.provider ? `/providers/${relationship.provider.slug}` : "/providers"}
                className="inline-panel px-5 py-4 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    {formatRelationshipStatus(relationship.status)}
                  </span>
                  {relationship.is_primary ? (
                    <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs text-[var(--accent-strong)]">
                      Primary
                    </span>
                  ) : relationship.is_favorite ? (
                    <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                      Favorite
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 text-xl font-semibold">
                  {relationship.provider?.display_name ?? "CareBridge Provider"}
                </div>
                <p className="mt-2 text-sm leading-6 muted">
                  {[relationship.provider?.credentials, relationship.provider?.specialties?.[0] ?? relationship.provider?.specialty]
                    .filter(Boolean)
                    .join(" | ")}
                </p>
                {relationship.last_appointment_at ? (
                  <p className="mt-3 text-sm leading-6 muted">
                    Last appointment {formatShortDate(relationship.last_appointment_at)}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="workspace-section">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="eyebrow">Care summaries</span>
            <h2 className="mt-3 text-2xl font-semibold">Follow-up guidance after your visits.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 muted">
              Providers can share concise follow-up summaries with next steps and what to monitor after an appointment.
            </p>
          </div>
          <Link href="/portal/summaries" className="btn-secondary">
            View all summaries
          </Link>
        </div>

        {recentFollowUps.length === 0 ? (
          <div className="mt-5 inline-panel px-5 py-5">
            <h3 className="text-lg font-semibold">No care summaries available yet.</h3>
            <p className="mt-2 text-sm leading-6 muted">
              Published follow-up notes from your providers will appear here after appointments.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {recentFollowUps.map((followUp) => {
              const provider = Array.isArray(followUp.providers) ? followUp.providers[0] ?? null : followUp.providers ?? null;
              return (
                <Link
                  key={followUp.id}
                  href={`/portal/appointments/${followUp.appointment_id}`}
                  className="inline-panel px-5 py-4 hover:-translate-y-0.5"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    {followUp.follow_up_title ?? "Visit follow-up"}
                  </div>
                  <div className="mt-3 text-xl font-semibold">{provider?.display_name ?? "CareBridge Provider"}</div>
                  <p className="mt-2 text-sm leading-6 muted">{followUp.follow_up_summary}</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="workspace-section">
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
            <div className="inline-panel px-5 py-5 lg:col-span-3">
              <h3 className="text-lg font-semibold">Start logging your daily health to get personalized recommendations.</h3>
              <p className="mt-2 text-sm leading-6 muted">
                As CareBridge learns from your check-ins and visit guidance, this section will suggest recipes that better fit your needs.
              </p>
            </div>
          ) : (
            recommendedRecipes.map((recipe) => (
              <Link key={recipe.id} href={`/recipes/${recipe.slug}`} className="inline-panel px-5 py-4 hover:-translate-y-0.5">
                <div className="rounded-[10px] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
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

      <section className="workspace-section grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="section-shell">
          <h2 className="text-2xl font-semibold">What CareBridge is building toward</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StepCard step="1" title="Schedule care" body="Browse providers, pick a slot, and confirm with less back-and-forth." />
            <StepCard step="2" title="Prepare securely" body="Complete intake and consent steps before the visit begins." />
            <StepCard step="3" title="Join remotely" body="Use telehealth workflows that are ready for a future video vendor integration." />
          </div>
        </div>

        <div className="section-shell">
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

function formatRelationshipStatus(status: string) {
  switch (status) {
    case "active":
      return "Active";
    case "past":
      return "Past";
    default:
      return "Booked";
  }
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
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
    <div className="metric-tile">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{title}</div>
      <div className="mt-2 text-sm leading-6 muted">{body}</div>
    </div>
  );
}

function StepCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="inline-panel px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Step {step}</div>
      <div className="mt-2 text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm leading-6 muted">{body}</div>
    </div>
  );
}
