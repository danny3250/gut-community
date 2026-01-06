import Link from "next/link";
import SignOutButton from "@/app/components/SignOutButton";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Bubble Gut Community</h1>
          <p className="text-sm opacity-80">Signed in as {user?.email}</p>
        </div>
        <SignOutButton />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard title="Recipes" desc="IBS & Crohn-friendly meals and filters" href="/recipes" />
        <DashboardCard title="Forum" desc="Member discussions and support" href="/forum" />
        <DashboardCard title="Articles" desc="Condition guides and education" href="/articles" />
        <DashboardCard title="My Profile" desc="Preferences, triggers, saved items" href="/profile" />
        <DashboardCard title="Support" desc="Help, FAQs, accessibility options" href="/support" />
        <DashboardCard title="Settings" desc="Account and notification settings" href="/settings" />
      </section>
    </main>
  );
}

function DashboardCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="border rounded-lg p-4 hover:bg-black/5 transition">
      <div className="font-medium">{title}</div>
      <div className="text-sm opacity-80 mt-1">{desc}</div>
    </Link>
  );
}
