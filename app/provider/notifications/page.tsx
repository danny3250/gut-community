import { redirect } from "next/navigation";
import NotificationList from "@/app/components/notifications/NotificationList";
import { MarkAllNotificationsReadButton } from "@/app/components/notifications/NotificationActions";
import { getUserNotifications, getUnreadNotificationCount } from "@/lib/carebridge/notifications";
import { createClient } from "@/lib/supabase/server";

export default async function ProviderNotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(supabase, user.id, 50),
    getUnreadNotificationCount(supabase, user.id),
  ]);

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="eyebrow">Notifications</span>
            <h1 className="mt-4 text-3xl font-semibold">Provider updates and care reminders.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 muted">
              Review appointment activity, patient submissions, secure messages, and provider verification updates without leaving the portal.
            </p>
          </div>
          {unreadCount > 0 ? <MarkAllNotificationsReadButton /> : null}
        </div>
      </section>

      <NotificationList
        notifications={notifications}
        emptyTitle="You're all caught up."
        emptyBody="Provider reminders and workflow updates will appear here."
      />
    </main>
  );
}
