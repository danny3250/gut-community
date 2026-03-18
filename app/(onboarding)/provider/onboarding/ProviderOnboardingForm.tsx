"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProviderApplicationRecord, ProviderDirectoryRecord } from "@/lib/carebridge/types";

type OrganizationOption = {
  id: string;
  name: string;
};

export default function ProviderOnboardingForm({
  application,
  provider,
  organizations,
}: {
  application: ProviderApplicationRecord | null;
  provider: ProviderDirectoryRecord | null;
  organizations: OrganizationOption[];
}) {
  const router = useRouter();
  const initialRecord = application ?? provider;
  const [legalName, setLegalName] = useState(application?.full_name ?? provider?.display_name ?? "");
  const [displayName, setDisplayName] = useState(initialRecord?.display_name ?? "");
  const [credentials, setCredentials] = useState(initialRecord?.credentials ?? "");
  const [specialty, setSpecialty] = useState(initialRecord?.specialty ?? "");
  const [statesServed, setStatesServed] = useState((initialRecord?.states_served ?? []).join(", "));
  const [licenseStates, setLicenseStates] = useState((initialRecord?.license_states ?? []).join(", "));
  const [licenseNumber, setLicenseNumber] = useState(initialRecord?.license_number ?? "");
  const [npiNumber, setNpiNumber] = useState(initialRecord?.npi_number ?? "");
  const [bio, setBio] = useState(initialRecord?.bio ?? "");
  const [telehealthEnabled, setTelehealthEnabled] = useState(initialRecord?.telehealth_enabled ?? true);
  const [organizationId, setOrganizationId] = useState(initialRecord?.organization_id ?? "");
  const [isAcceptingPatients, setIsAcceptingPatients] = useState(initialRecord?.is_accepting_patients ?? false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/provider/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legalName,
        displayName,
        credentials,
        specialty,
        statesServed: statesServed.split(","),
        licenseStates: licenseStates.split(","),
        licenseNumber,
        npiNumber,
        bio,
        telehealthEnabled,
        organizationId: organizationId || null,
        isAcceptingPatients,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Could not submit provider onboarding.");
      return;
    }

    router.push("/provider");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="panel px-6 py-6 sm:px-8">
      <span className="eyebrow">Provider onboarding</span>
      <h1 className="mt-4 text-3xl font-semibold">Complete your provider profile to begin verification.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 muted">
        Public listing, bookings, and verified provider actions stay disabled until the CareBridge team reviews your application.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Legal or full name">
          <input className="field" value={legalName} onChange={(event) => setLegalName(event.target.value)} required />
        </Field>
        <Field label="Display name">
          <input className="field" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
        </Field>
        <Field label="Credentials">
          <input className="field" value={credentials} onChange={(event) => setCredentials(event.target.value)} placeholder="MD, DO, RD, LCSW" />
        </Field>
        <Field label="Specialty">
          <input className="field" value={specialty} onChange={(event) => setSpecialty(event.target.value)} placeholder="Gastroenterology" />
        </Field>
        <Field label="States served">
          <input className="field" value={statesServed} onChange={(event) => setStatesServed(event.target.value)} placeholder="NY, NJ, CT" />
        </Field>
        <Field label="License states">
          <input className="field" value={licenseStates} onChange={(event) => setLicenseStates(event.target.value)} placeholder="NY, NJ, CT" />
        </Field>
        <Field label="License number">
          <input className="field" value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} />
        </Field>
        <Field label="NPI number">
          <input className="field" value={npiNumber} onChange={(event) => setNpiNumber(event.target.value)} />
        </Field>
        <Field label="Organization">
          <select className="field" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
            <option value="">Independent provider</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="rounded-[24px] border border-[var(--border)] bg-white/72 px-4 py-4 text-sm">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={telehealthEnabled} onChange={(event) => setTelehealthEnabled(event.target.checked)} className="mt-1" />
            <span>
              <span className="block font-semibold">Telehealth enabled</span>
              <span className="mt-1 block muted">Enable telehealth visit workflows for this provider profile.</span>
            </span>
          </label>
          <label className="mt-4 flex items-start gap-3">
            <input type="checkbox" checked={isAcceptingPatients} onChange={(event) => setIsAcceptingPatients(event.target.checked)} className="mt-1" />
            <span>
              <span className="block font-semibold">Accepting new patients</span>
              <span className="mt-1 block muted">Patients will only see booking actions after verification is complete.</span>
            </span>
          </label>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-semibold">Short bio</label>
        <textarea className="field min-h-[160px]" value={bio} onChange={(event) => setBio(event.target.value)} />
      </div>

      {message ? <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">{message}</div> : null}

      <div className="mt-6">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving
            ? "Submitting..."
            : application?.status === "rejected"
              ? "Update and resubmit"
              : application?.status === "pending"
                ? "Update application"
                : "Submit for review"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      <div className="mb-2 font-medium">{label}</div>
      {children}
    </label>
  );
}
