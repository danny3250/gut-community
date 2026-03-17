import Link from "next/link";
import { getCurrentUserWithRole } from "@/lib/auth/session";
import NewCommunityPostForm from "../NewCommunityPostForm";

export default async function NewCommunityPostPage() {
  const session = await getCurrentUserWithRole();

  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <Link href="/community" className="text-sm muted hover:text-[var(--foreground)]">
        Back to community
      </Link>

      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <span className="eyebrow">New discussion</span>
          <h1 className="mt-4 text-4xl font-semibold">Start a community question</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 muted">
            Use a clear topic so patients and providers can find the discussion more easily. Community threads
            are for support and information, not direct medical diagnosis.
          </p>
        </div>
        <div className="panel-strong px-6 py-6">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Before you post
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6 muted">
            <li>Keep personal health details to what feels appropriate for a public support space.</li>
            <li>Use a topic tag that makes the question easier to route to the right provider audience.</li>
            <li>Formal medical decisions should still happen through an appointment or visit workflow.</li>
          </ul>
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        {session.user ? (
          <NewCommunityPostForm />
        ) : (
          <div className="space-y-4">
            <div className="rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-4 text-sm muted">
              Sign in to create a community post.
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary">
                Sign in
              </Link>
              <Link href="/signup" className="btn-secondary">
                Create account
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
