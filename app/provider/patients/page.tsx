import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchProviderPatientHealthSummary } from "@/lib/carebridge/health";
import { fetchProviderByUserId, isProviderVerified } from "@/lib/carebridge/providers";

export default async function ProviderPatientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const provider = await fetchProviderByUserId(supabase, user.id);
  if (!provider) redirect("/portal");
  if (!isProviderVerified(provider)) redirect("/provider");

  const summaries = await fetchProviderPatientHealthSummary(supabase, provider.id);

  return (
    <main className="grid gap-5">
      <section className="panel px-6 py-6 sm:px-8">
        <span className="eyebrow">Patients</span>
        <h1 className="mt-4 text-3xl font-semibold">Recent patient check-ins at a glance.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 muted">
          Review recent overall feeling, symptom frequency, and food patterns before visits without leaving the provider portal.
        </p>
      </section>

      <section className="grid gap-4">
        {summaries.length === 0 ? (
          <div className="panel px-6 py-6 sm:px-8">
            <h2 className="text-xl font-semibold">No patients connected yet.</h2>
            <p className="mt-2 text-sm leading-6 muted">
              Patients with scheduled appointments will appear here along with their most recent daily health check-ins.
            </p>
          </div>
        ) : (
          summaries.map(({ patient, trends, recentCheckins }) => (
            <article key={patient.id} className="panel px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">{patient.legal_name || patient.email || "Patient"}</h2>
                  <p className="mt-2 text-sm leading-6 muted">
                    Recent check-ins: {recentCheckins.length} · Average feeling: {trends.averageFeeling ?? "—"} / 5
                  </p>
                </div>
                <Link href={`/provider/patients/${patient.id}`} className="btn-secondary px-4 py-2 text-sm">
                  View patient trend
                </Link>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <TrendList title="Most common symptoms" items={trends.symptomFrequency.map((item) => `${item.name} (${item.count})`)} emptyText="No symptoms logged yet." />
                <TrendList title="Recently logged foods" items={trends.recentFoods.map((item) => `${item.name} (${item.count})`)} emptyText="No foods logged yet." />
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

function TrendList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4">
      <div className="text-sm font-semibold">{title}</div>
      {items.length === 0 ? (
        <div className="mt-2 text-sm muted">{emptyText}</div>
      ) : (
        <ul className="mt-3 space-y-2 text-sm muted">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
