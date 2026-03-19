type TrendPoint = {
  label: string;
  value: number;
};

type AdminTrendChartProps = {
  title: string;
  description?: string;
  points: TrendPoint[];
  color?: string;
};

export default function AdminTrendChart({
  title,
  description,
  points,
  color = "var(--accent)",
}: AdminTrendChartProps) {
  const safePoints = points.length > 0 ? points : [{ label: "Now", value: 0 }];
  const maxValue = Math.max(...safePoints.map((point) => point.value), 1);
  const coordinates = safePoints
    .map((point, index) => {
      const x = safePoints.length === 1 ? 0 : (index / (safePoints.length - 1)) * 100;
      const y = 100 - (point.value / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-white/82 px-5 py-5">
      <div className="text-sm font-semibold">{title}</div>
      {description ? <p className="mt-1 text-sm leading-6 muted">{description}</p> : null}
      <div className="mt-4">
        <svg viewBox="0 0 100 100" className="h-36 w-full overflow-visible">
          <line x1="0" y1="100" x2="100" y2="100" stroke="rgba(124,112,93,0.22)" strokeWidth="1" />
          <polyline fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={coordinates} />
          {safePoints.map((point, index) => {
            const x = safePoints.length === 1 ? 0 : (index / (safePoints.length - 1)) * 100;
            const y = 100 - (point.value / maxValue) * 100;
            return <circle key={`${point.label}-${index}`} cx={x} cy={y} r="2.6" fill={color} />;
          })}
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-2 text-[11px] uppercase tracking-[0.12em] text-[rgba(43,36,28,0.56)]">
        {safePoints.map((point) => (
          <div key={point.label} className="truncate">
            {point.label}
          </div>
        ))}
      </div>
    </section>
  );
}
