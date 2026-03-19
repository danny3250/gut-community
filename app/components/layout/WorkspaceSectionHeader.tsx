type WorkspaceSectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function WorkspaceSectionHeader({
  eyebrow,
  title,
  description,
  action,
}: WorkspaceSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{eyebrow}</div> : null}
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
