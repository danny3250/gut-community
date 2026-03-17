import Link from "next/link";
import { formatNotificationTimestamp, type NotificationRecord } from "@/lib/carebridge/notifications";
import { MarkNotificationReadButton } from "./NotificationActions";

export default function NotificationList({
  notifications,
  emptyTitle,
  emptyBody,
}: {
  notifications: NotificationRecord[];
  emptyTitle: string;
  emptyBody: string;
}) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
        <h2 className="text-xl font-semibold">{emptyTitle}</h2>
        <p className="mt-2 text-sm leading-6 muted">{emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {notifications.map((notification) => (
        <div key={notification.id} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-lg font-semibold">{notification.title}</div>
                <span
                  className={
                    notification.is_read
                      ? "rounded-full border border-[var(--border)] px-3 py-1 text-xs muted"
                      : "rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]"
                  }
                >
                  {notification.is_read ? "Read" : "Unread"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 muted">{notification.body}</p>
              <div className="mt-3 text-xs muted">{formatNotificationTimestamp(notification.scheduled_for)}</div>
            </div>

            <div className="flex flex-wrap gap-3">
              {notification.link_url ? (
                <Link href={notification.link_url} className="btn-secondary px-4 py-2 text-sm">
                  Open
                </Link>
              ) : null}
              {!notification.is_read ? <MarkNotificationReadButton notificationId={notification.id} /> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
