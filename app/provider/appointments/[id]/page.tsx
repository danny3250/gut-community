import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppointmentStatusBadge from "@/app/components/AppointmentStatusBadge";
import AppointmentActionButton from "@/app/components/appointments/AppointmentActionButton";
import WorkspaceSectionHeader from "@/app/components/layout/WorkspaceSectionHeader";
import AppointmentMessageButton from "@/app/components/messages/AppointmentMessageButton";
import PatientFollowUpEditor from "@/app/components/provider-notes/PatientFollowUpEditor";
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
import { fetchProviderVisitNoteForAppointment, fetchRecentProviderNotesForPatient } from "@/lib/carebridge/provider-notes";
import { fetchProviderFollowUpForAppointment } from "@/lib/carebridge/follow-ups";
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

  const [appointment, forms, documents, note, followUp, recentNotes] = await Promise.all([
    fetchProviderAppointmentById(supabase, provider.id, id),
    fetchAppointmentFormsForProvider(supabase, id),
    fetchAppointmentDocumentsForProvider(supabase, id),
    fetchProviderVisitNoteForAppointment(supabase, provider.id, id),
    fetchProviderFollowUpForAppointment(supabase, provider.id, id),
    fetchProviderAppointmentById(supabase, provider.id, id).then((appt) =>
      appt ? fetchRecentProviderNotesForPatient(supabase, provider.id, appt.patient_id, 6) : []
    ),
  ]);

  if (!appointment) notFound();

  const conversationId = await getConversationIdForAppointment(supabase, appointment.id);
  const patient = Array.isArray(appointment.patients) ? appointment.patients[0] ?? null : appointment.patients ?? null;
  const organization = patient?.organizations;
  const organizationName = Array.isArray(organization) ? organization[0]?.name : organization?.name;
  const timing = getAppointmentTimingState(appointment);
  const canManage = !["cancelled", "completed", "no_show"].includes(appointment.status);

  return (
    <main className="grid gap-7">
      <section className="section-shell">
        <Link href="/provider/appointments" className="text-sm text-link hover:opacity-80">
          Back to appointments
        </Link>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="eyebrow">Appointment detail</span>
            <h1 className="mt-3 text-3xl font-semibold">{patient?.legal_name || patient?.email || "Patient"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 muted">
              Review appointment context, launch the visit, and complete documentation from one provider workspace.
            </p>
          </div>
          <AppointmentStatusBadge status={appointment.status} />
        </div>

        <div className="section-rule mt-6 grid gap-4 lg:grid-cols-3">
          <InfoBlock label="Start time" value={formatAppointmentDateTime(appointment)} />
          <InfoBlock label="Timezone" value={appointment.timezone} />
          <InfoBlock label="Telehealth vendor" value={appointment.visit_vendor ?? "Will be created at launch"} />
          <InfoBlock label="Appointment type" value={appointment.appointment_type.replace(/_/g, " ")} />
          <InfoBlock label="Patient contact" value={patient?.email ?? "No email on file"} />
          <InfoBlock label="Organization" value={organizationName ?? "Independent"} />
        </div>

        <div className="section-rule mt-6 flex flex-wrap gap-3">
          <AppointmentMessageButton appointmentId={appointment.id} hrefBase="/provider/messages" existingConversationId={conversationId} />
          {timing.canJoin ? (
            <LaunchVisitButton appointmentId={appointment.id} />
          ) : (
            <div className="inline-panel p-3 text-sm muted">{timing.label}</div>
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

      <section className="workspace-section grid gap-6 xl:grid-cols-2">
        <div>
          <WorkspaceSectionHeader
            title="Private notes"
            description="Internal provider documentation and prior note history for this patient."
          />
          <div className="mt-5">
            <ProviderVisitNoteEditor
              appointmentId={appointment.id}
              patientId={appointment.patient_id}
              initialNote={note}
              recentNotes={recentNotes}
              currentAppointmentSummary={{
                id: appointment.id,
                startTime: appointment.start_time,
                timezone: appointment.timezone,
                appointmentType: appointment.appointment_type,
                status: appointment.status,
              }}
            />
          </div>
        </div>

        <div>
          <WorkspaceSectionHeader
            title="Patient follow-up"
            description="The shared follow-up summary the patient receives after you publish it."
          />
          <div className="mt-5">
            <PatientFollowUpEditor
              appointmentId={appointment.id}
              patientId={appointment.patient_id}
              initialFollowUp={followUp}
            />
          </div>
        </div>
      </section>

      <section className="workspace-section grid gap-8 lg:grid-cols-2">
        <div>
          <WorkspaceSectionHeader
            title="Submitted forms"
            description="Intake details and structured responses linked to this appointment."
          />
          <div className="mt-5 grid gap-0">
            {forms.length === 0 ? (
              <div className="inline-panel px-4 py-4 text-sm muted">
                No intake forms submitted yet.
              </div>
            ) : (
              forms.map((form) => {
                const template = getIntakeTemplate(form.form_type);
                return (
                  <div key={form.id} className="data-row first:border-t-0">
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
                      <span className="inline-panel px-3 py-1 text-xs capitalize">
                        {form.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {Object.entries(form.structured_responses ?? {}).map(([key, value]) => (
                        <div key={key} className="inline-panel px-3 py-3">
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
        </div>

        <div>
          <WorkspaceSectionHeader
            title="Appointment documents"
            description="Files linked to this appointment for review before or after the visit."
          />
          <div className="mt-5 grid gap-0">
            {documents.length === 0 ? (
              <div className="inline-panel px-4 py-4 text-sm muted">
                No documents linked to this appointment.
              </div>
            ) : (
              documents.map((document) => (
                <div key={document.id} className="data-row first:border-t-0">
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
      </section>
    </main>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{label}</div>
      <div className="mt-2 text-sm leading-6 muted capitalize">{value}</div>
    </div>
  );
}
