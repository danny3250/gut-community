type AdminStatusBadgeProps = {
  status: string | null | undefined;
};

const STATUS_STYLES: Record<string, string> = {
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  suspended: "border-orange-200 bg-orange-50 text-orange-700",
  patient: "border-slate-200 bg-slate-50 text-slate-700",
  provider: "border-sky-200 bg-sky-50 text-sky-700",
  admin: "border-violet-200 bg-violet-50 text-violet-700",
};

export default function AdminStatusBadge({ status }: AdminStatusBadgeProps) {
  const normalizedStatus = (status ?? "unknown").toLowerCase();
  const style = STATUS_STYLES[normalizedStatus] ?? "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${style}`}>
      {normalizedStatus.replace(/_/g, " ")}
    </span>
  );
}
