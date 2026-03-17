import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReplyComposer from "../ReplyComposer";
import { fetchCommunityPostById, fetchCommunityReplies } from "@/lib/community";
import { getCurrentUserWithRole } from "@/lib/auth/session";
import { fetchPatientByUserId } from "@/lib/carebridge/patients";
import { fetchProviderByUserId, isProviderVerified } from "@/lib/carebridge/providers";

type CommunityThreadPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CommunityThreadPage({ params }: CommunityThreadPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const [post, replies, session] = await Promise.all([
    fetchCommunityPostById(supabase, id),
    fetchCommunityReplies(supabase, id),
    getCurrentUserWithRole(),
  ]);

  if (!post) notFound();

  const author = Array.isArray(post.profiles) ? (post.profiles[0] ?? null) : post.profiles;
  const canReply = Boolean(session.user);
  const providerAccount = session.user && session.role === "provider" ? await fetchProviderByUserId(supabase, session.user.id) : null;
  const canMarkOfficial = Boolean(providerAccount && isProviderVerified(providerAccount));
  const patient = session.user ? await fetchPatientByUserId(supabase, session.user.id) : null;
  const providerReplyHelper = session.role === "provider" && !canMarkOfficial
    ? "Verified provider responses activate after your provider application is approved."
    : null;

  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <Link href="/community" className="text-sm muted hover:text-[var(--foreground)]">
        Back to community
      </Link>

      <section className="panel px-6 py-8 sm:px-8">
        {post.topic ? (
          <div className="mb-4 inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
            {post.topic}
          </div>
        ) : null}
        <h1 className="text-4xl font-semibold">{post.title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 muted">{post.body}</p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm muted">
          <span>{author?.display_name ?? "Community member"}</span>
          <span>{new Date(post.created_at).toLocaleString()}</span>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Replies</h2>
            <div className="text-sm muted">{replies.length} total</div>
          </div>

          {replies.length === 0 ? (
            <div className="panel px-6 py-6 text-sm muted">
              No replies yet. A provider or community member can start the conversation.
            </div>
          ) : (
            replies.map((reply) => {
              const replyAuthor = Array.isArray(reply.profiles) ? (reply.profiles[0] ?? null) : reply.profiles;
              const provider = Array.isArray(reply.providers) ? (reply.providers[0] ?? null) : reply.providers;
              const isProviderResponse = reply.is_provider_response && provider && provider.verification_status === "verified";
              const canBookProvider = Boolean(provider?.slug) && (!patient?.state || Boolean(provider?.states_served?.includes?.(patient.state)));
              const stateBlocked = Boolean(patient?.state && provider && !provider.states_served?.includes(patient.state));

              return (
                <article
                  key={reply.id}
                  className={`panel px-6 py-6 sm:px-8 ${isProviderResponse ? "border-[rgba(31,77,57,0.24)] bg-[rgba(220,239,227,0.46)]" : ""}`}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-lg font-semibold">
                          {isProviderResponse ? provider.display_name : replyAuthor?.display_name ?? "Community member"}
                        </div>
                        {isProviderResponse ? (
                          <>
                            <div className="mt-1 text-sm leading-6 muted">
                              {[provider.credentials, provider.specialty].filter(Boolean).join(" | ")}
                            </div>
                            <div className="mt-3 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                              {reply.verified_at ? "Verified Provider Response" : "Provider Response"}
                            </div>
                          </>
                        ) : (
                          <div className="mt-1 text-sm leading-6 muted">{replyAuthor?.role ?? "Community member"}</div>
                        )}
                      </div>
                      <div className="text-sm muted">{new Date(reply.created_at).toLocaleString()}</div>
                    </div>

                    <div className="text-sm leading-7">{reply.body}</div>

                    {isProviderResponse ? (
                      <div className="space-y-4 rounded-[24px] border border-[rgba(31,77,57,0.12)] bg-white/78 px-4 py-4">
                        <div className="flex flex-wrap gap-3">
                          {provider.slug ? (
                            <>
                              {canBookProvider ? (
                                <Link href={`/providers/${provider.slug}`} className="btn-primary px-4 py-2 text-sm">
                                  Book an appointment with this provider
                                </Link>
                              ) : null}
                              <Link href={`/providers/${provider.slug}`} className="btn-secondary px-4 py-2 text-sm">
                                View provider profile
                              </Link>
                            </>
                          ) : null}
                        </div>
                        {stateBlocked ? (
                          <p className="text-sm leading-6 muted">
                            This provider is not currently licensed to provide telehealth visits in your state.
                          </p>
                        ) : null}
                        <p className="text-xs leading-5 muted">
                          Community responses are informational and do not replace a formal medical consultation.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>

        <aside className="space-y-4">
          <section className="panel px-6 py-6 sm:px-8">
            <span className="eyebrow">Reply</span>
            <h2 className="mt-4 text-2xl font-semibold">Join the thread</h2>
            <p className="mt-3 text-sm leading-6 muted">
              Patients can ask follow-up questions. Providers can post clearly labeled informational responses.
            </p>
            <div className="mt-5">
              {canReply ? (
                <ReplyComposer postId={post.id} canMarkOfficial={canMarkOfficial} helperMessage={providerReplyHelper} />
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-4 text-sm muted">
                    Sign in to reply or join the conversation as a patient or provider.
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
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
