type AdminMetricCardProps = {
  label: string;
  value: string;
  helper?: string;
};

export default function AdminMetricCard({ label, value, helper }: AdminMetricCardProps) {
  return (
    <section className="metric-tile">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{value}</div>
      {helper ? <div className="mt-2 text-sm leading-6 muted">{helper}</div> : null}
    </section>
  );
}
