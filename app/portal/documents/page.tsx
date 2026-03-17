import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAppointmentsForPatient, formatAppointmentDateTime } from "@/lib/carebridge/appointments";
import { fetchPatientDocuments, formatDocumentCategory } from "@/lib/carebridge/forms";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";
import DocumentDeleteButton from "./DocumentDeleteButton";
import DocumentUploadForm from "./DocumentUploadForm";

export default async function PortalDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const patient = await fetchPatientByUserId(supabase, user.id);
  if (!patient) redirect("/portal");

  const [documents, appointments] = await Promise.all([
    fetchPatientDocuments(supabase, patient.id),
    fetchAppointmentsForPatient(supabase, patient.id),
  ]);

  const appointmentOptions = appointments
    .filter((appointment) => !["completed", "cancelled", "no_show"].includes(appointment.status))
    .map((appointment) => {
      const provider = Array.isArray(appointment.providers) ? appointment.providers[0] ?? null : appointment.providers ?? null;
      return {
        id: appointment.id,
        label: `${provider?.display_name ?? "Provider"} · ${formatAppointmentDateTime(appointment)}`,
      };
    });

  const appointmentsById = new Map(
    appointments.map((appointment) => {
      const provider = Array.isArray(appointment.providers) ? appointment.providers[0] ?? null : appointment.providers ?? null;
      return [appointment.id, `${provider?.display_name ?? "Provider"} · ${formatAppointmentDateTime(appointment)}`] as const;
    })
  );

  const filteredDocuments = resolvedSearchParams.appointmentId
    ? documents.filter((document) => document.appointment_id === resolvedSearchParams.appointmentId)
    : documents;

  return (
    <main className="grid gap-5">
      <DocumentUploadForm appointmentId={resolvedSearchParams.appointmentId ?? ""} appointmentOptions={appointmentOptions} />

      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Documents</span>
        <h1 className="mt-4 text-3xl font-semibold">Uploaded documents</h1>
        <div className="mt-5 grid gap-4">
          {filteredDocuments.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
              <h2 className="text-xl font-semibold">
                {resolvedSearchParams.appointmentId ? "No documents linked to this appointment yet." : "Uploaded documents will appear here."}
              </h2>
              <p className="mt-2 text-sm leading-6 muted">Use uploads for referrals, lab results, and other appointment-relevant files.</p>
            </div>
          ) : (
            filteredDocuments.map((document) => (
              <div key={document.id} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-lg font-semibold">{document.title ?? document.file_path.split("/").pop()}</div>
                    <div className="mt-1 text-sm muted">{formatDocumentCategory(document.category)}</div>
                    {document.appointment_id ? (
                      <div className="mt-2 text-sm muted">
                        Linked to {appointmentsById.get(document.appointment_id) ?? "appointment"}
                      </div>
                    ) : null}
                    {document.description ? <div className="mt-2 text-sm leading-6 muted">{document.description}</div> : null}
                    <div className="mt-2 text-xs muted">{new Date(document.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/api/documents/${document.id}/download`} className="btn-secondary px-4 py-2 text-sm">
                      View or download
                    </Link>
                    <DocumentDeleteButton documentId={document.id} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
