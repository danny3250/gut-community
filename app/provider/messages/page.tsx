import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listConversationsForUser } from "@/lib/carebridge/messages";
import { fetchProviderByUserId, isProviderVerified } from "@/lib/carebridge/providers";

export default async function ProviderMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const provider = await fetchProviderByUserId(supabase, user.id);
  if (!provider) redirect("/portal");
  if (!isProviderVerified(provider)) redirect("/provider");

  const conversations = await listConversationsForUser(supabase, user.id, "provider");

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Messages</span>
        <h1 className="mt-4 text-3xl font-semibold">Patient conversations in one secure inbox.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          Use appointment-linked threads for practical coordination, follow-up questions, and portal-based communication.
        </p>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <div className="grid gap-4">
          {conversations.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
              <h2 className="text-xl font-semibold">No patient messages yet.</h2>
              <p className="mt-2 text-sm leading-6 muted">Appointment-related conversations will appear here.</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <Link key={conversation.id} href={`/provider/messages/${conversation.id}`} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5 hover:-translate-y-0.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-xl font-semibold">{conversation.counterpartName}</div>
                      {conversation.unreadCount > 0 ? (
                        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                          {conversation.unreadCount} unread
                        </span>
                      ) : null}
                    </div>
                    {conversation.counterpartMeta ? <div className="mt-1 text-sm muted">{conversation.counterpartMeta}</div> : null}
                    <div className="mt-2 text-sm font-medium">{conversation.subject}</div>
                    {conversation.appointmentLabel ? <div className="mt-1 text-xs muted">{conversation.appointmentLabel}</div> : null}
                    {conversation.preview ? <div className="mt-3 text-sm leading-6 muted line-clamp-2">{conversation.preview}</div> : null}
                  </div>
                  <div className="text-sm muted">
                    {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleString() : "New thread"}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
