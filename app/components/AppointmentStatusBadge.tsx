type AppointmentStatusBadgeProps = {
  status: string;
};

const STATUS_STYLES: Record<string, string> = {
  requested: "border-amber-200 bg-amber-50 text-amber-900",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-900",
  cancelled: "border-slate-200 bg-slate-100 text-slate-700",
  completed: "border-sky-200 bg-sky-50 text-sky-900",
  no_show: "border-rose-200 bg-rose-50 text-rose-900",
};

export default function AppointmentStatusBadge({ status }: AppointmentStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? "border-[var(--border)] bg-white/70 text-[var(--foreground)]";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
