import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchProviderVisitNoteForAppointment } from "@/lib/carebridge/provider-notes";
import { fetchVisitWithContext } from "@/lib/carebridge/visits";
import { Role } from "@/lib/auth/roles";
import { TelehealthVisitService } from "@/services/telehealth/service";
import VisitExperience from "./VisitExperience";

type VisitPageProps = {
  params: Promise<{ visitId: string }>;
};

export default async function VisitPage({ params }: VisitPageProps) {
  const { visitId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: Role }>();

  let visitContext;
  try {
    visitContext = await fetchVisitWithContext(supabase, visitId);
  } catch {
    notFound();
  }

  const patient = Array.isArray(visitContext.patients) ? visitContext.patients[0] : visitContext.patients;
  const provider = Array.isArray(visitContext.providers) ? visitContext.providers[0] : visitContext.providers;
  const appointment = Array.isArray(visitContext.appointments) ? visitContext.appointments[0] : visitContext.appointments;

  const isAdmin =
    profile?.role === "admin" ||
    profile?.role === "organization_owner" ||
    profile?.role === "support_staff";
  const isPatient = patient?.user_id === user.id;
  const isProvider = provider?.user_id === user.id;

  if (!isAdmin && !isPatient && !isProvider) {
    redirect("/portal");
  }

  const service = new TelehealthVisitService(supabase);
  const participantRole = isProvider ? "provider" : isAdmin ? "admin" : "patient";
  const updatedVisit =
    participantRole === "admin"
      ? visitContext
      : await service.enterVisit(visitId, participantRole === "provider" ? "provider" : "patient");
  const providerNote =
    provider?.id && appointment?.id
      ? await fetchProviderVisitNoteForAppointment(supabase, provider.id, appointment.id)
      : null;

  return (
    <main className="shell py-6 sm:py-10">
      <VisitExperience
        visitId={visitId}
        participantRole={participantRole}
        initialStatus={updatedVisit.status}
        providerName={provider?.display_name ?? "Provider"}
        patientName={patient?.legal_name ?? patient?.email ?? "Patient"}
        appointmentType={appointment?.appointment_type ?? "telehealth"}
        appointmentTime={
          appointment
            ? new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: appointment.timezone,
              }).format(new Date(appointment.start_time))
            : "Visit time"
        }
        startedAt={updatedVisit.started_at}
        appointmentId={appointment?.id ?? null}
        patientId={patient?.id ?? null}
        initialNote={providerNote}
      />
    </main>
  );
}
