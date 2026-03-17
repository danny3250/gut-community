import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FormResponseEditor from "@/app/portal/forms/FormResponseEditor";
import { fetchPatientAppointmentById } from "@/lib/carebridge/appointments";
import { fetchAppointmentFormsForPatient, getIntakeTemplate } from "@/lib/carebridge/forms";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";

export default async function AppointmentFormEditorPage({
  params,
}: {
  params: Promise<{ id: string; formType: string }>;
}) {
  const { id, formType } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const patient = await fetchPatientByUserId(supabase, user.id);
  if (!patient) redirect("/portal");

  const appointment = await fetchPatientAppointmentById(supabase, patient.id, id);
  if (!appointment) notFound();

  const template = getIntakeTemplate(formType);
  if (!template) notFound();

  const existingForms = await fetchAppointmentFormsForPatient(supabase, patient.id, id);
  const existing = existingForms.find((form) => form.form_type === formType) ?? null;

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <Link href={`/portal/appointments/${id}`} className="text-sm muted hover:text-[var(--foreground)]">
          Back to appointment
        </Link>
      </section>
      <FormResponseEditor appointmentId={id} template={template} existingForm={existing} />
    </main>
  );
}
