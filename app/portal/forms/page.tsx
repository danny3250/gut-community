import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAppointmentsForPatient } from "@/lib/carebridge/appointments";
import {
  fetchPatientForms,
  formatFormTypeLabel,
  getIntakeTemplate,
  getRequiredFormTypesForAppointment,
} from "@/lib/carebridge/forms";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";

export default async function PortalFormsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const patient = await fetchPatientByUserId(supabase, user.id);
  if (!patient) redirect("/portal");

  const [appointments, forms] = await Promise.all([
    fetchAppointmentsForPatient(supabase, patient.id),
    fetchPatientForms(supabase, patient.id),
  ]);

  const formsByKey = new Map(forms.map((form) => [`${form.appointment_id}:${form.form_type}`, form] as const));
  const upcomingAppointments = appointments.filter(
    (appointment) => !["completed", "cancelled", "no_show"].includes(appointment.status)
  );

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Forms</span>
        <h1 className="mt-4 text-3xl font-semibold">Complete appointment forms before your visit.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          Use these structured forms to share intake details, telehealth readiness, and appointment goals before your provider review.
        </p>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <h2 className="text-2xl font-semibold">Appointment-linked forms</h2>
        <div className="mt-5 grid gap-4">
          {upcomingAppointments.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
              <h3 className="text-lg font-semibold">You don&apos;t have any forms to complete right now.</h3>
              <p className="mt-2 text-sm leading-6 muted">Forms linked to upcoming appointments will appear here.</p>
            </div>
          ) : (
            upcomingAppointments.map((appointment) => {
              const provider = Array.isArray(appointment.providers) ? appointment.providers[0] ?? null : appointment.providers ?? null;
              const requiredTypes = getRequiredFormTypesForAppointment(appointment.appointment_type);

              return (
                <div key={appointment.id} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
                  <div className="text-xl font-semibold">{provider?.display_name ?? "Provider"}</div>
                  <div className="mt-2 text-sm leading-6 muted">
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: appointment.timezone,
                    }).format(new Date(appointment.start_time))}
                  </div>
                  <div className="mt-4 grid gap-3">
                    {requiredTypes.map((formType) => {
                      const template = getIntakeTemplate(formType);
                      const existing = formsByKey.get(`${appointment.id}:${formType}`) ?? null;

                      return (
                        <div key={formType} className="rounded-[22px] border border-[var(--border)] bg-white/80 px-4 py-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="text-sm font-semibold">{template?.title ?? formatFormTypeLabel(formType)}</div>
                              <div className="mt-1 text-sm muted">{template?.description ?? "Appointment intake form"}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs capitalize">
                                {existing?.status ?? "pending"}
                              </span>
                              <Link
                                href={
                                  existing
                                    ? `/portal/forms/${existing.id}`
                                    : `/portal/appointments/${appointment.id}/forms/${formType}`
                                }
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
              );
            })
          )}
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <h2 className="text-2xl font-semibold">Recent submissions</h2>
        <div className="mt-5 grid gap-4">
          {forms.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
              <h3 className="text-lg font-semibold">No submitted forms yet.</h3>
              <p className="mt-2 text-sm leading-6 muted">
                Completed intake forms will appear here so you can review what your provider received.
              </p>
            </div>
          ) : (
            forms.slice(0, 6).map((form) => {
              const template = getIntakeTemplate(form.form_type);
              return (
                <div key={form.id} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-lg font-semibold">{template?.title ?? formatFormTypeLabel(form.form_type)}</div>
                      <div className="mt-1 text-sm muted">
                        Submitted{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(form.submitted_at ?? form.updated_at))}
                      </div>
                    </div>
                    <Link href={`/portal/forms/${form.id}`} className="btn-secondary px-4 py-2 text-sm">
                      Review submitted form
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
