import type { CheckinTrendPoint } from "@/lib/carebridge/health";

export default function PatientAnalyticsPanel({
  feelingTrend,
  sleepStressTrend,
  symptomFrequency,
  foodFrequency,
}: {
  feelingTrend: CheckinTrendPoint[];
  sleepStressTrend: CheckinTrendPoint[];
  symptomFrequency: Array<{ name: string; count: number }>;
  foodFrequency: Array<{ name: string; count: number }>;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="grid gap-4">
        <ChartPanel
          title="Overall feeling trend"
          subtitle="Recent check-ins show how the patient has been feeling over time."
        >
          {feelingTrend.length === 0 ? (
            <EmptyChart text="No check-in trend data yet." />
          ) : (
            <LineChart
              points={feelingTrend.map((point) => ({
                label: formatShortDate(point.date),
                value: point.overallFeeling,
              }))}
              min={1}
              max={5}
              stroke="var(--accent-strong)"
              fill="rgba(47, 111, 77, 0.12)"
            />
          )}
        </ChartPanel>

        <ChartPanel
          title="Sleep and stress trends"
          subtitle="Compare sleep hours and stress level across recent check-ins."
        >
          {sleepStressTrend.length === 0 ? (
            <EmptyChart text="No sleep or stress data yet." />
          ) : (
            <DualLineChart
              points={sleepStressTrend.map((point) => ({
                label: formatShortDate(point.date),
                sleep: point.sleepHours,
                stress: point.stressLevel,
              }))}
            />
          )}
        </ChartPanel>
      </div>

      <div className="grid gap-4">
        <ChartPanel
          title="Symptom frequency"
          subtitle="Most commonly logged symptoms during the recent check-in window."
        >
          {symptomFrequency.length === 0 ? (
            <EmptyChart text="No symptoms logged yet." />
          ) : (
            <BarList items={symptomFrequency} tone="accent" />
          )}
        </ChartPanel>

        <ChartPanel
          title="Foods logged recently"
          subtitle="Foods that have appeared most often in recent check-ins."
        >
          {foodFrequency.length === 0 ? (
            <EmptyChart text="No foods logged yet." />
          ) : (
            <BarList items={foodFrequency} tone="neutral" />
          )}
        </ChartPanel>
      </div>
    </section>
  );
}

function ChartPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel px-5 py-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm leading-6 muted">{subtitle}</p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-5 text-sm muted">
      {text}
    </div>
  );
}

function LineChart({
  points,
  min,
  max,
  stroke,
  fill,
}: {
  points: Array<{ label: string; value: number }>;
  min: number;
  max: number;
  stroke: string;
  fill: string;
}) {
  const width = 520;
  const height = 220;
  const padding = 22;
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const scaleY = (value: number) => {
    const normalized = (value - min) / Math.max(1, max - min);
    return height - padding - normalized * (height - padding * 2);
  };

  const coordinates = points.map((point, index) => ({
    x: padding + stepX * index,
    y: scaleY(point.value),
    label: point.label,
    value: point.value,
  }));

  const linePath = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1]?.x ?? padding} ${height - padding} L ${coordinates[0]?.x ?? padding} ${height - padding} Z`;

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-white/78 px-4 py-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full overflow-visible">
        {[1, 2, 3, 4, 5].map((tick) => (
          <g key={tick}>
            <line
              x1={padding}
              x2={width - padding}
              y1={scaleY(tick)}
              y2={scaleY(tick)}
              stroke="rgba(35, 49, 38, 0.08)"
              strokeWidth="1"
            />
            <text x={0} y={scaleY(tick) + 4} fontSize="11" fill="rgba(35,49,38,0.58)">
              {tick}
            </text>
          </g>
        ))}
        <path d={areaPath} fill={fill} />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coordinates.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="4.5" fill={stroke} />
            <text x={point.x} y={height - 2} textAnchor="middle" fontSize="11" fill="rgba(35,49,38,0.58)">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function DualLineChart({
  points,
}: {
  points: Array<{ label: string; sleep: number | null; stress: number | null }>;
}) {
  const width = 520;
  const height = 220;
  const padding = 22;
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const scaleY = (value: number, max: number) => height - padding - (value / Math.max(1, max)) * (height - padding * 2);
  const sleepMax = Math.max(8, ...points.map((point) => point.sleep ?? 0));
  const stressMax = 5;

  const sleepCoordinates = points.map((point, index) => ({
    x: padding + stepX * index,
    y: point.sleep === null ? null : scaleY(point.sleep, sleepMax),
    label: point.label,
  }));
  const stressCoordinates = points.map((point, index) => ({
    x: padding + stepX * index,
    y: point.stress === null ? null : scaleY(point.stress, stressMax),
    label: point.label,
  }));

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-white/78 px-4 py-4">
      <div className="mb-3 flex flex-wrap gap-4 text-xs font-medium muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-strong)]" />
          Sleep hours
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#c4884f]" />
          Stress level
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full overflow-visible">
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = padding + ((height - padding * 2) / 4) * tick;
          return <line key={tick} x1={padding} x2={width - padding} y1={y} y2={y} stroke="rgba(35,49,38,0.08)" strokeWidth="1" />;
        })}
        <PathFromPoints points={sleepCoordinates} stroke="var(--accent-strong)" />
        <PathFromPoints points={stressCoordinates} stroke="#c4884f" />
        {sleepCoordinates.map((point) => (
          <text key={point.label} x={point.x} y={height - 2} textAnchor="middle" fontSize="11" fill="rgba(35,49,38,0.58)">
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function PathFromPoints({
  points,
  stroke,
}: {
  points: Array<{ x: number; y: number | null }>;
  stroke: string;
}) {
  const filtered = points.filter((point): point is { x: number; y: number } => point.y !== null);
  if (filtered.length === 0) return null;
  const path = filtered.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  return (
    <>
      <path d={path} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {filtered.map((point, index) => (
        <circle key={`${stroke}-${index}`} cx={point.x} cy={point.y} r="4" fill={stroke} />
      ))}
    </>
  );
}

function BarList({
  items,
  tone,
}: {
  items: Array<{ name: string; count: number }>;
  tone: "accent" | "neutral";
}) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.name}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{item.name}</span>
            <span className="muted">{item.count}</span>
          </div>
          <div className="h-2.5 rounded-full bg-[var(--surface-secondary)]">
            <div
              className={`h-2.5 rounded-full ${tone === "accent" ? "bg-[var(--accent-strong)]" : "bg-[#c4884f]"}`}
              style={{ width: `${Math.max(14, (item.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatShortDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}
