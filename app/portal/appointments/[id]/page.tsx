import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppointmentStatusBadge from "@/app/components/AppointmentStatusBadge";
import AppointmentActionButton from "@/app/components/appointments/AppointmentActionButton";
import AppointmentMessageButton from "@/app/components/messages/AppointmentMessageButton";
import {
  fetchPatientAppointmentById,
  formatAppointmentDateTime,
  getAppointmentTimingState,
} from "@/lib/carebridge/appointments";
import {
  fetchAppointmentDocumentsForPatient,
  fetchAppointmentFormsForPatient,
  formatDocumentCategory,
  formatFormTypeLabel,
  getIntakeTemplate,
  getRequiredFormTypesForAppointment,
} from "@/lib/carebridge/forms";
import { getConversationIdForAppointment } from "@/lib/carebridge/messages";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";
import JoinVisitButton from "../JoinVisitButton";

type PortalAppointmentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PortalAppointmentDetailPage({ params }: PortalAppointmentDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const patient = await fetchPatientByUserId(supabase, user.id);
  if (!patient) redirect("/portal");

  const [appointment, forms, documents] = await Promise.all([
    fetchPatientAppointmentById(supabase, patient.id, id),
    fetchAppointmentFormsForPatient(supabase, patient.id, id),
    fetchAppointmentDocumentsForPatient(supabase, patient.id, id),
  ]);

  if (!appointment) notFound();

  const conversationId = await getConversationIdForAppointment(supabase, appointment.id);
  const provider = Array.isArray(appointment.providers) ? appointment.providers[0] ?? null : appointment.providers ?? null;
  const organization = provider?.organizations;
  const organizationName = Array.isArray(organization) ? organization[0]?.name : organization?.name;
  const timing = getAppointmentTimingState(appointment);
  const canManage = !["cancelled", "completed", "no_show"].includes(appointment.status) && new Date(appointment.end_time) >= new Date();
  const formsByType = new Map(forms.map((form) => [form.form_type, form] as const));
  const requiredForms = getRequiredFormTypesForAppointment(appointment.appointment_type);

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <Link href="/portal/appointments" className="text-sm muted hover:text-[var(--foreground)]">
          Back to appointments
        </Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="eyebrow">Appointment detail</span>
            <h1 className="mt-3 text-3xl font-semibold">{provider?.display_name ?? "Provider"}</h1>
            <p className="mt-2 text-sm leading-6 muted">
              {[provider?.credentials, provider?.specialty].filter(Boolean).join(" | ")}
            </p>
          </div>
          <AppointmentStatusBadge status={appointment.status} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard label="Date and time" value={formatAppointmentDateTime(appointment)} />
          <InfoCard label="Timezone" value={appointment.timezone} />
          <InfoCard label="Visit type" value={appointment.appointment_type.replace(/_/g, " ")} />
          <InfoCard label="Organization" value={organizationName ?? "Independent provider"} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <AppointmentMessageButton appointmentId={appointment.id} hrefBase="/portal/messages" existingConversationId={conversationId} />
          {timing.canJoin ? (
            <JoinVisitButton appointmentId={appointment.id} />
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-2 text-sm muted">{timing.label}</div>
          )}
          {canManage ? (
            <>
              <Link href={`/portal/appointments/${appointment.id}/reschedule`} className="btn-secondary px-4 py-2 text-sm">
                Reschedule
              </Link>
              <AppointmentActionButton
                endpoint={`/api/appointments/${appointment.id}/cancel`}
                label="Cancel appointment"
                pendingLabel="Cancelling..."
                confirmMessage="Cancel this appointment?"
              />
            </>
          ) : null}
        </div>

        {timing.helperText ? <p className="mt-4 text-sm leading-6 muted">{timing.helperText}</p> : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">Visit notes</h2>
          <p className="mt-3 text-sm leading-6 muted">
            Shared appointment notes, visit summaries, and next steps can live here as CareBridge messaging and chart workflows expand.
          </p>
        </div>
        <div className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">Forms and documents</h2>
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Required forms</div>
              <div className="mt-3 grid gap-3">
                {requiredForms.map((formType) => {
                  const template = getIntakeTemplate(formType);
                  const existing = formsByType.get(formType) ?? null;

                  return (
                    <div key={formType} className="rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold">{template?.title ?? formatFormTypeLabel(formType)}</div>
                          <div className="mt-1 text-sm muted">{template?.description ?? "Appointment intake form"}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs capitalize">
                            {existing?.status ?? "pending"}
                          </span>
                          <Link
                            href={existing ? `/portal/forms/${existing.id}` : `/portal/appointments/${appointment.id}/forms/${formType}`}
                            className="btn-secondary px-4 py-2 text-sm"
                          >
                            {existing ? "Review submitted form" : "Complete form"}
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Linked documents</div>
                <Link href={`/portal/documents?appointmentId=${appointment.id}`} className="btn-secondary px-4 py-2 text-sm">
                  Upload document
                </Link>
              </div>
              <div className="mt-3 grid gap-3">
                {documents.length === 0 ? (
                  <div className="rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-4 text-sm muted">
                    No documents linked to this appointment yet.
                  </div>
                ) : (
                  documents.map((document) => (
                    <div key={document.id} className="rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold">{document.title ?? document.file_path.split("/").pop()}</div>
                          <div className="mt-1 text-sm muted">{formatDocumentCategory(document.category)}</div>
                          {document.description ? <div className="mt-2 text-sm muted">{document.description}</div> : null}
                        </div>
                        <Link href={`/api/documents/${document.id}/download`} className="btn-secondary px-4 py-2 text-sm">
                          View document
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{label}</div>
      <div className="mt-2 text-sm leading-6 muted capitalize">{value}</div>
    </div>
  );
}
