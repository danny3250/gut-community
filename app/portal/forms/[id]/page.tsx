import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchPatientFormById, formatFormTypeLabel, getIntakeTemplate } from "@/lib/carebridge/forms";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";

export default async function PortalFormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const patient = await fetchPatientByUserId(supabase, user.id);
  if (!patient) redirect("/portal");

  const form = await fetchPatientFormById(supabase, patient.id, id);
  if (!form) notFound();

  const template = getIntakeTemplate(form.form_type);

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <Link href="/portal/forms" className="text-sm muted hover:text-[var(--foreground)]">
          Back to forms
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">{template?.title ?? formatFormTypeLabel(form.form_type)}</h1>
        <p className="mt-3 text-sm leading-6 muted">{template?.description ?? "Submitted intake form"}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Status" value={form.status} />
          <SummaryCard
            label="Submitted"
            value={new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(form.submitted_at ?? form.updated_at))}
          />
          <SummaryCard label="Appointment" value={form.appointment_id ? "Linked" : "General"} />
        </div>
        {form.appointment_id ? (
          <div className="mt-5">
            <Link href={`/portal/appointments/${form.appointment_id}`} className="btn-secondary px-4 py-2 text-sm">
              Back to appointment
            </Link>
          </div>
        ) : null}
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <div className="grid gap-4">
          {Object.entries(form.structured_responses ?? {}).map(([key, value]) => (
            <div key={key} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                {template?.fields.find((field) => field.id === key)?.label ?? formatFormTypeLabel(key)}
              </div>
              <div className="mt-2 text-sm leading-6 muted">
                {Array.isArray(value) ? value.join(", ") : String(value ?? "")}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{label}</div>
      <div className="mt-2 text-sm leading-6 muted capitalize">{value}</div>
    </div>
  );
}
