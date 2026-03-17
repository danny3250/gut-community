import Link from "next/link";

const services = [
  { title: "Provider discovery", body: "Search for providers, specialties, and telehealth availability." },
  { title: "Scheduling foundation", body: "Request or book visits with status, timezone, and appointment-type support." },
  { title: "Telehealth workflow", body: "Prepare for remote visits with waiting room, launch, and follow-up support." },
  { title: "Patient support tools", body: "Use resources, forms, messaging, community, and wellness-support content in one platform." },
];

export default function ServicesPage() {
  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <section className="panel px-6 py-8 sm:px-8">
        <span className="eyebrow">Services</span>
        <h1 className="mt-4 text-4xl font-semibold">Tools for reaching care, preparing for visits, and staying connected.</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 muted">
          CareBridge combines care access, patient support, provider workflows, and telehealth-ready foundations in one platform.
        </p>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {services.map((item) => (
          <div key={item.title} className="panel px-6 py-6">
            <h2 className="text-2xl font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 muted">{item.body}</p>
          </div>
        ))}
      </section>
      <section className="panel px-6 py-6 sm:px-8">
        <div className="flex flex-wrap gap-3">
          <Link href="/providers" className="btn-primary">View providers</Link>
          <Link href="/signup" className="btn-secondary">Create account</Link>
        </div>
      </section>
    </main>
  );
}
