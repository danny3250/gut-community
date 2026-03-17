import Link from "next/link";

export default function PortalResourcesPage() {
  return (
    <section className="panel px-6 py-6 sm:px-8">
      <span className="eyebrow">Saved resources</span>
      <h1 className="mt-4 text-3xl font-semibold">Education and wellness support tied to care access</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 muted">
        Public educational resources, wellness-supportive content, and recipes can all feed back into the
        patient portal as saved content and follow-up support.
      </p>
      <div className="mt-5">
        <Link href="/resources" className="btn-secondary">
          Open public resources
        </Link>
      </div>
    </section>
  );
}
