type AdminTableProps = {
  columns: string[];
  children: React.ReactNode;
};

export default function AdminTable({ columns, children }: AdminTableProps) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-white/84">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-[rgba(255,252,246,0.96)]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="border-b border-[var(--border)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
