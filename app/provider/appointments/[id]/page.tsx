import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppointmentStatusBadge from "@/app/components/AppointmentStatusBadge";
import AppointmentActionButton from "@/app/components/appointments/AppointmentActionButton";
import AppointmentMessageButton from "@/app/components/messages/AppointmentMessageButton";
import ProviderVisitNoteEditor from "@/app/components/provider-notes/ProviderVisitNoteEditor";
import {
  fetchProviderAppointmentById,
  formatAppointmentDateTime,
  getAppointmentTimingState,
} from "@/lib/carebridge/appointments";
import {
  fetchAppointmentDocumentsForProvider,
  fetchAppointmentFormsForProvider,
  formatDocumentCategory,
  formatFormTypeLabel,
  getIntakeTemplate,
} from "@/lib/carebridge/forms";
import { getConversationIdForAppointment } from "@/lib/carebridge/messages";
import { fetchProviderVisitNoteForAppointment } from "@/lib/carebridge/provider-notes";
import { fetchProviderByUserId } from "@/lib/carebridge/providers";
import LaunchVisitButton from "./LaunchVisitButton";

type ProviderAppointmentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProviderAppointmentDetailPage({
  params,
}: ProviderAppointmentDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const provider = await fetchProviderByUserId(supabase, user.id);
  if (!provider) redirect("/portal");

  const [appointment, forms, documents, note] = await Promise.all([
    fetchProviderAppointmentById(supabase, provider.id, id),
    fetchAppointmentFormsForProvider(supabase, id),
    fetchAppointmentDocumentsForProvider(supabase, id),
    fetchProviderVisitNoteForAppointment(supabase, provider.id, id),
  ]);

  if (!appointment) notFound();

  const conversationId = await getConversationIdForAppointment(supabase, appointment.id);
  const patient = Array.isArray(appointment.patients) ? appointment.patients[0] ?? null : appointment.patients ?? null;
  const organization = patient?.organizations;
  const organizationName = Array.isArray(organization) ? organization[0]?.name : organization?.name;
  const timing = getAppointmentTimingState(appointment);
  const canManage = !["cancelled", "completed", "no_show"].includes(appointment.status);

  return (
    <div className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <Link href="/provider/appointments" className="text-sm muted hover:text-[var(--foreground)]">
          Back to appointments
        </Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="eyebrow">Appointment detail</span>
            <h1 className="mt-3 text-3xl font-semibold">{patient?.legal_name || patient?.email || "Patient"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 muted">
              Review the appointment context, intake details, linked files, and visit status before the session begins.
            </p>
          </div>
          <AppointmentStatusBadge status={appointment.status} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <InfoCard label="Start time" value={formatAppointmentDateTime(appointment)} />
          <InfoCard label="Timezone" value={appointment.timezone} />
          <InfoCard label="Telehealth vendor" value={appointment.visit_vendor ?? "Will be created at launch"} />
          <InfoCard label="Appointment type" value={appointment.appointment_type.replace(/_/g, " ")} />
          <InfoCard label="Patient contact" value={patient?.email ?? "No email on file"} />
          <InfoCard label="Organization" value={organizationName ?? "Independent"} />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <AppointmentMessageButton appointmentId={appointment.id} hrefBase="/provider/messages" existingConversationId={conversationId} />
          {timing.canJoin ? (
            <LaunchVisitButton appointmentId={appointment.id} />
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm muted">{timing.label}</div>
          )}
          {canManage ? (
            <>
              <Link href={`/provider/appointments/${appointment.id}/reschedule`} className="btn-secondary px-4 py-2 text-sm">
                Reschedule
              </Link>
              <AppointmentActionButton endpoint={`/api/appointments/${appointment.id}/status`} label="Mark confirmed" pendingLabel="Saving..." body={{ status: "confirmed" }} />
              <AppointmentActionButton endpoint={`/api/appointments/${appointment.id}/status`} label="Mark completed" pendingLabel="Saving..." body={{ status: "completed" }} />
              <AppointmentActionButton endpoint={`/api/appointments/${appointment.id}/status`} label="Mark no-show" pendingLabel="Saving..." body={{ status: "no_show" }} />
              <AppointmentActionButton endpoint={`/api/appointments/${appointment.id}/cancel`} label="Cancel appointment" pendingLabel="Cancelling..." confirmMessage="Cancel this appointment?" />
            </>
          ) : null}
        </div>
        {timing.helperText ? <p className="mt-4 text-sm leading-6 muted">{timing.helperText}</p> : null}
      </section>

      <ProviderVisitNoteEditor
        appointmentId={appointment.id}
        patientId={appointment.patient_id}
        initialNote={note}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <section className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">Submitted forms</h2>
          <div className="mt-4 grid gap-3">
            {forms.length === 0 ? (
              <div className="rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-4 text-sm muted">
                No intake forms submitted yet.
              </div>
            ) : (
              forms.map((form) => {
                const template = getIntakeTemplate(form.form_type);
                return (
                  <div key={form.id} className="rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold">{template?.title ?? formatFormTypeLabel(form.form_type)}</div>
                        <div className="mt-1 text-sm muted">
                          Submitted{" "}
                          {new Intl.DateTimeFormat("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(form.submitted_at ?? form.updated_at))}
                        </div>
                      </div>
                      <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs capitalize">
                        {form.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {Object.entries(form.structured_responses ?? {}).map(([key, value]) => (
                        <div key={key} className="rounded-[18px] border border-[var(--border)] bg-white/80 px-3 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                            {template?.fields.find((field) => field.id === key)?.label ?? formatFormTypeLabel(key)}
                          </div>
                          <div className="mt-2 text-sm leading-6 muted">
                            {Array.isArray(value) ? value.join(", ") : String(value ?? "")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
        <section className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">Appointment documents</h2>
          <div className="mt-4 grid gap-3">
            {documents.length === 0 ? (
              <div className="rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-4 text-sm muted">
                No documents linked to this appointment.
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
        </section>
      </section>
    </div>
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
