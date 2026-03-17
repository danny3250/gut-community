export default async function ProviderAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <section className="panel px-6 py-6 sm:px-8">
      <span className="eyebrow">Appointment detail</span>
      <h1 className="mt-4 text-3xl font-semibold">Appointment {id}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 muted">
        This route is ready for intake review, patient context, visit launch, secure notes placeholders,
        and telehealth session state handling.
      </p>
    </section>
  );
}
