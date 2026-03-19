type AdminFilterBarProps = {
  children: React.ReactNode;
};

export default function AdminFilterBar({ children }: AdminFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[16px] border border-[#e5e7eb] bg-white px-4 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
      {children}
    </div>
  );
}
