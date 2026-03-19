import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchRecentProviderNotes, getProviderVisitNotePreview } from "@/lib/carebridge/provider-notes";
import { fetchProviderByUserId, isProviderVerified } from "@/lib/carebridge/providers";

export default async function ProviderNotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const provider = await fetchProviderByUserId(supabase, user.id);
  if (!provider) redirect("/portal");
  if (!isProviderVerified(provider)) redirect("/provider");

  const notes = await fetchRecentProviderNotes(supabase, provider.id, 24);

  return (
    <section className="panel px-6 py-6 sm:px-8">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Visit notes</div>
      <h1 className="mt-3 text-3xl font-semibold">Recent provider notes</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 muted">
        Review recently updated visit notes, reopen appointment context, and keep patient documentation close at hand.
      </p>

      <div className="mt-6 grid gap-4">
        {notes.length === 0 ? (
          <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5 text-sm muted">
            No provider notes have been created yet.
          </div>
        ) : (
          notes.map((note) => {
            const appointment = Array.isArray(note.appointments) ? note.appointments[0] ?? null : note.appointments ?? null;
            const patient = Array.isArray(note.patients) ? note.patients[0] ?? null : note.patients ?? null;
            return (
              <article key={note.id} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-lg font-semibold">{note.subject ?? "Visit note"}</div>
                    <div className="mt-1 text-sm muted">
                      {patient?.legal_name ?? patient?.email ?? "Patient"} {appointment ? "·" : ""}{" "}
                      {appointment
                        ? new Intl.DateTimeFormat("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: appointment.timezone,
                          }).format(new Date(appointment.start_time))
                        : "Recent note"}
                    </div>
                  </div>
                  <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs capitalize">{note.status}</span>
                </div>
                <p className="mt-4 text-sm leading-6 muted">{getProviderVisitNotePreview(note.note_body)}</p>
                {appointment?.id ? (
                  <Link href={`/provider/appointments/${appointment.id}`} className="mt-4 inline-flex btn-secondary px-4 py-2 text-sm">
                    Open appointment
                  </Link>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
