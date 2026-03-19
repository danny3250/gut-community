import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchCommunityPosts } from "@/lib/community";
import { fetchProviderByUserId, getProviderVerificationMessage, isProviderVerified } from "@/lib/carebridge/providers";

type ProviderCommunityPageProps = {
  searchParams: Promise<{ topic?: string }>;
};

export default async function ProviderCommunityPage({ searchParams }: ProviderCommunityPageProps) {
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [provider, posts] = await Promise.all([
    fetchProviderByUserId(supabase, user.id),
    fetchCommunityPosts(supabase),
  ]);

  const selectedTopic = resolvedSearchParams.topic?.trim() ?? "";
  const matchTerms = new Set(
    [
      provider?.specialty ?? "",
      ...(provider?.specialties ?? []),
      ...(provider?.condition_focus ?? []),
      ...(provider?.areas_of_care ?? []),
    ]
      .map((value) => value.toLowerCase().trim())
      .filter(Boolean)
  );

  const relatedPosts = posts.filter((post) => {
    const topic = post.topic?.toLowerCase().trim() ?? "";
    if (!topic) return false;
    return Array.from(matchTerms).some((term) => topic.includes(term) || term.includes(topic));
  });

  const visiblePosts = (selectedTopic ? posts.filter((post) => post.topic === selectedTopic) : posts).slice(0, 20);
  const topics = Array.from(new Set(posts.map((post) => post.topic).filter(Boolean))).sort();
  const verified = isProviderVerified(provider);

  return (
    <section className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Community</span>
        <h1 className="mt-4 text-3xl font-semibold">Provider responses and topic-guided questions</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 muted">
          Review patient questions, focus on topics close to your specialty, and reply with clearly labeled
          provider responses that can lead patients toward a profile or appointment when appropriate.
        </p>
        {provider ? (
          <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4 text-sm muted">
            Matching against {provider.specialties[0] ?? provider.specialty ?? "your clinical focus"} and{" "}
            {(provider.condition_focus?.length ?? 0) + (provider.areas_of_care?.length ?? 0)} scope areas.
          </div>
        ) : null}
        {!verified ? (
          <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4 text-sm muted">
            {getProviderVerificationMessage(provider)}
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5">
          <section className="panel px-6 py-6 sm:px-8">
            <span className="eyebrow">Related topics</span>
            <h2 className="mt-4 text-2xl font-semibold">Questions near your practice</h2>
            <div className="mt-5 grid gap-3">
              {relatedPosts.length === 0 ? (
                <div className="text-sm muted">No specialty-matched questions yet.</div>
              ) : (
                relatedPosts.slice(0, 6).map((post) => (
                  <Link key={post.id} href={`/community/${post.id}`} className="rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-4 hover:-translate-y-0.5">
                    <div className="text-sm font-semibold">{post.title}</div>
                    <div className="mt-2 text-xs muted">{post.topic ?? "General question"}</div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="panel px-6 py-6 sm:px-8">
            <span className="eyebrow">Filter</span>
            <h2 className="mt-4 text-2xl font-semibold">Browse by topic</h2>
            <form className="mt-5 flex flex-wrap gap-3">
              <button type="submit" className={`btn-secondary px-4 py-2 text-sm ${selectedTopic ? "" : "border-[var(--accent)] text-[var(--accent-strong)]"}`}>
                All topics
              </button>
              {topics.map((topic) => (
                <button
                  key={topic}
                  type="submit"
                  name="topic"
                  value={topic ?? ""}
                  className={`btn-secondary px-4 py-2 text-sm ${selectedTopic === topic ? "border-[var(--accent)] text-[var(--accent-strong)]" : ""}`}
                >
                  {topic}
                </button>
              ))}
            </form>
          </section>
        </div>

        <section className="panel px-6 py-6 sm:px-8">
          <span className="eyebrow">Question queue</span>
          <h2 className="mt-4 text-2xl font-semibold">Open threads to answer</h2>
          <div className="mt-5 grid gap-3">
            {visiblePosts.length === 0 ? (
              <div className="text-sm muted">No community questions match this filter right now.</div>
            ) : (
              visiblePosts.map((post) => (
                <article key={post.id} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <div className="text-lg font-semibold">{post.title}</div>
                      <div className="mt-2 text-sm leading-6 muted">{post.body}</div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs muted">
                        <span>{post.topic ?? "General question"}</span>
                        <span>{post.reply_count ?? 0} repl{post.reply_count === 1 ? "y" : "ies"}</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Link href={`/community/${post.id}`} className="btn-primary px-4 py-2 text-sm">
                        {verified ? "Answer question" : "View question"}
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </section>
  );
}
