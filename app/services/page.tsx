import Link from "next/link";

const services = [
  { title: "Provider discovery", body: "Search by specialty, state served, and telehealth availability to find a good next step." },
  { title: "Scheduling and reminders", body: "Book visits, review appointment details, and stay on track with practical in-app reminders." },
  { title: "Telehealth preparation", body: "Handle pre-visit forms, documents, join timing, and remote visit access in one connected flow." },
  { title: "Support between visits", body: "Use messaging, resources, recipes, and daily health tracking to stay connected to care over time." },
];

export default function ServicesPage() {
  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <section className="panel px-6 py-8 sm:px-8">
        <span className="eyebrow">Services</span>
        <h1 className="mt-4 text-4xl font-semibold">Tools for finding care, preparing well, and staying connected.</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 muted">
          CareBridge brings together the practical pieces around care access so patients and providers can spend less energy chasing logistics.
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
