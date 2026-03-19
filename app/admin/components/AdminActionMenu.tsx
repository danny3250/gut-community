type AdminActionMenuProps = {
  children: React.ReactNode;
};

export default function AdminActionMenu({ children }: AdminActionMenuProps) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}
