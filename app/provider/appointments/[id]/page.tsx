import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchProviderByUserId } from "@/lib/carebridge/providers";
import LaunchVisitButton from "./LaunchVisitButton";

type ProviderAppointmentDetailPageProps = {
  params: Promise<{ id: string }>;
};

type AppointmentContext = {
  id: string;
  status: string;
  appointment_type: string;
  start_time: string;
  end_time: string;
  timezone: string;
  visit_vendor: string | null;
  join_url_placeholder: string | null;
  patients?: {
    legal_name: string | null;
    email: string | null;
  } | {
    legal_name: string | null;
    email: string | null;
  }[] | null;
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

  const { data } = await supabase
    .from("appointments")
    .select("id,status,appointment_type,start_time,end_time,timezone,visit_vendor,join_url_placeholder,patients(legal_name,email)")
    .eq("id", id)
    .eq("provider_id", provider.id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const appointment = data as AppointmentContext;
  const patient = Array.isArray(appointment.patients) ? appointment.patients[0] : appointment.patients;
  const isTelehealth = appointment.appointment_type === "telehealth";

  return (
    <div className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Appointment detail</span>
        <h1 className="mt-4 text-3xl font-semibold">
          {patient?.legal_name || patient?.email || "Patient"} · {appointment.appointment_type.replace(/_/g, " ")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          Review the appointment context, then launch the visit when it is time to begin.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <InfoCard
            label="Start time"
            value={new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: appointment.timezone,
            }).format(new Date(appointment.start_time))}
          />
          <InfoCard label="Status" value={appointment.status} />
          <InfoCard label="Telehealth vendor" value={appointment.visit_vendor ?? "Will be created at launch"} />
        </div>

        {isTelehealth ? (
          <LaunchVisitButton appointmentId={appointment.id} />
        ) : (
          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm muted">
            Only telehealth appointments use the visit launch flow.
          </div>
        )}
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <h2 className="text-2xl font-semibold">Visit workflow notes</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          Launching the visit creates the session if needed, moves the visit lifecycle forward, and
          routes both participants into the shared visit experience.
        </p>
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
