import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchCommunityPosts, getCommunityPostBadge, getCommunityTopics } from "@/lib/community";

type CommunityPageProps = {
  searchParams: Promise<{ topic?: string }>;
};

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;
  const posts = await fetchCommunityPosts(supabase);
  const selectedTopic = resolvedSearchParams.topic?.trim() ?? "";
  const topics = getCommunityTopics(posts);

  const filteredPosts = selectedTopic
    ? posts.filter((post) => post.topic === selectedTopic)
    : posts;

  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">Community</span>
          <h1 className="section-title">Questions, shared experience, and provider-highlighted responses in one place.</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            Browse community questions by topic, read clearly labeled provider responses, and move into a
            provider profile when someone feels like the right next step for care.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">
              Join CareBridge
            </Link>
            <Link href="/providers" className="btn-secondary">
              Browse providers
            </Link>
            <Link href="/community/new" className="btn-secondary">
              Ask a question
            </Link>
          </div>
        </div>
        <div className="panel-strong px-6 py-6">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Community principles
          </div>
          <ul className="mt-4 space-y-4 text-sm leading-6 muted">
            <li>Provider replies are clearly labeled and linked back to real provider profiles.</li>
            <li>Community replies are informational and do not replace formal medical consultation.</li>
            <li>Questions stay easier to scan through topic-based organization.</li>
          </ul>
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <form className="flex flex-wrap gap-3">
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

      {filteredPosts.length === 0 ? (
        <section className="panel px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-semibold">No community questions match that topic yet.</h2>
          <p className="mt-3 text-sm leading-6 muted">
            Try another topic or come back as more patient and provider participation is added.
          </p>
        </section>
      ) : (
        <section className="grid gap-4">
          {filteredPosts.map((post) => {
            const author = Array.isArray(post.profiles) ? (post.profiles[0] ?? null) : post.profiles;
            return (
              <article key={post.id} className="panel px-6 py-6 sm:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    {getCommunityPostBadge(post) ? (
                      <div className="mb-3 inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                        {getCommunityPostBadge(post)}
                      </div>
                    ) : null}
                    <h2 className="text-2xl font-semibold">{post.title}</h2>
                    <p className="mt-3 text-sm leading-6 muted">{post.body}</p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs muted">
                      <span>{author?.display_name ?? "Community member"}</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      <span>{post.reply_count ?? 0} repl{post.reply_count === 1 ? "y" : "ies"}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Link href={`/community/${post.id}`} className="btn-secondary px-4 py-2 text-sm">
                      Open thread
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
