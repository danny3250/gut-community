import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessageComposer from "@/app/components/messages/MessageComposer";
import { getConversationForUser, markConversationAsRead } from "@/lib/carebridge/messages";

export default async function PortalMessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await markConversationAsRead(supabase, id, user.id);
  const detail = await getConversationForUser(supabase, id, user.id, "patient");
  if (!detail) notFound();

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <Link href="/portal/messages" className="text-sm muted hover:text-[var(--foreground)]">
          Back to messages
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">{detail.counterpartName}</h1>
        <p className="mt-2 text-sm leading-6 muted">{detail.counterpartMeta ?? detail.subject}</p>
        {detail.appointmentLabel ? <div className="mt-3 text-xs muted">{detail.appointmentLabel}</div> : null}
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <div className="space-y-4">
          {detail.messages.map((message) => {
            const outgoing = message.sender_user_id === user.id;
            return (
              <div key={message.id} className={`rounded-[24px] px-5 py-4 ${outgoing ? "bg-[var(--accent-soft)]" : "border border-[var(--border)] bg-white/72"}`}>
                <div className="text-sm leading-7">{message.body}</div>
                <div className="mt-3 text-xs muted">{new Date(message.created_at).toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <MessageComposer conversationId={detail.conversation.id} />
      </section>
    </main>
  );
}
