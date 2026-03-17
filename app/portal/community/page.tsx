import Link from "next/link";

export default function PortalCommunityPage() {
  return (
    <section className="panel px-6 py-6 sm:px-8">
      <span className="eyebrow">Community</span>
      <h1 className="mt-4 text-3xl font-semibold">Moderated discussion and support participation</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 muted">
        Patient discussion, provider-authored guidance, and future moderation workflows all belong here.
        Community areas should remain clearly distinct from direct medical advice or visit workflows.
      </p>
      <div className="mt-5">
        <Link href="/community" className="btn-secondary">
          Open community overview
        </Link>
      </div>
    </section>
  );
}
