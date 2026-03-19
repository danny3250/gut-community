import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchRecentPublishedFollowUpsForPatient } from "@/lib/carebridge/follow-ups";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";
import { createClient } from "@/lib/supabase/server";

export default async function PortalSummariesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const patient = await fetchPatientByUserId(supabase, user.id);
  if (!patient) redirect("/portal");

  const followUps = await fetchRecentPublishedFollowUpsForPatient(supabase, patient.id, 20);

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Care summaries</span>
        <h1 className="mt-4 text-3xl font-semibold">Visit follow-up and next steps in one place.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          This page shows the patient-facing follow-up summaries your providers chose to share after appointments.
        </p>
      </section>

      <section className="grid gap-4">
        {followUps.length === 0 ? (
          <div className="panel px-6 py-6 sm:px-8">
            <h2 className="text-xl font-semibold">No care summaries available yet.</h2>
            <p className="mt-2 text-sm leading-6 muted">
              Your recent care summaries will appear here after provider follow-up is published.
            </p>
          </div>
        ) : (
          followUps.map((followUp) => {
            const provider = Array.isArray(followUp.providers) ? followUp.providers[0] ?? null : followUp.providers ?? null;
            const appointment = Array.isArray(followUp.appointments) ? followUp.appointments[0] ?? null : followUp.appointments ?? null;

            return (
              <article key={followUp.id} className="panel px-6 py-6 sm:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                      {followUp.follow_up_title ?? "Visit follow-up"}
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold">{provider?.display_name ?? "CareBridge Provider"}</h2>
                    <p className="mt-2 text-sm leading-6 muted">{followUp.follow_up_summary}</p>
                  </div>
                  <Link href={`/portal/appointments/${followUp.appointment_id}`} className="btn-secondary px-4 py-2 text-sm">
                    Open appointment
                  </Link>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <SummaryBlock
                    title="Next steps"
                    body={followUp.follow_up_instructions ?? "No additional next steps were included."}
                  />
                  <SummaryBlock
                    title="What to track"
                    body={followUp.what_to_track ?? "No tracking instructions were added."}
                  />
                  <SummaryBlock
                    title="Follow-up timing"
                    body={followUp.recommended_next_step ?? "No follow-up timing was added."}
                  />
                </div>

                {appointment ? (
                  <p className="mt-4 text-sm leading-6 muted">
                    Shared{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: appointment.timezone,
                    }).format(new Date(appointment.start_time))}
                  </p>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

function SummaryBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{title}</div>
      <div className="mt-2 text-sm leading-6 muted">{body}</div>
    </div>
  );
}
