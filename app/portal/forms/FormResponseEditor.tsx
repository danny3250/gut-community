"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IntakeField, IntakeFormRecord, IntakeTemplate } from "@/lib/carebridge/forms";

function initialValue(field: IntakeField, existing: Record<string, unknown>) {
  const value = existing[field.id];
  if (field.type === "checkbox_group") {
    return Array.isArray(value) ? value : [];
  }
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export default function FormResponseEditor({
  appointmentId,
  template,
  existingForm,
}: {
  appointmentId: string;
  template: IntakeTemplate;
  existingForm: IntakeFormRecord | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(
    Object.fromEntries(template.fields.map((field) => [field.id, initialValue(field, existingForm?.structured_responses ?? {})]))
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId,
        formType: template.formType,
        responses: values,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; formId?: string };
    setSaving(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Could not save form.");
      return;
    }

    router.push(`/portal/forms/${payload.formId ?? ""}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="panel px-6 py-6 sm:px-8">
      <span className="eyebrow">Appointment form</span>
      <h1 className="mt-4 text-3xl font-semibold">{template.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 muted">{template.description}</p>

      <div className="mt-6 space-y-5">
        {template.fields.map((field) => (
          <div key={field.id}>
            <label className="mb-2 block text-sm font-semibold">{field.label}</label>
            <FieldControl field={field} value={values[field.id]} onChange={(value) => setValues((current) => ({ ...current, [field.id]: value }))} />
          </div>
        ))}
      </div>

      {message ? <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">{message}</div> : null}

      <div className="mt-6">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Submitting..." : existingForm ? "Update form" : "Submit form"}
        </button>
      </div>
    </form>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: IntakeField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "textarea") {
    return <textarea className="field min-h-[140px]" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />;
  }

  if (field.type === "yes_no") {
    return (
      <div className="flex flex-wrap gap-2">
        {["yes", "no"].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={
              value === option ? "btn-primary px-4 py-2 text-sm" : "btn-secondary px-4 py-2 text-sm"
            }
          >
            {option === "yes" ? "Yes" : "No"}
          </button>
        ))}
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <select className="field" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select an option</option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "checkbox_group") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="grid gap-3">
        {field.options.map((option) => {
          const checked = selected.includes(option);
          return (
            <label key={option} className="flex items-center gap-3 rounded-[22px] border border-[var(--border)] bg-white/72 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onChange(
                    checked ? selected.filter((item) => item !== option) : [...selected, option]
                  )
                }
              />
              {option}
            </label>
          );
        })}
      </div>
    );
  }

  return <input className="field" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />;
}
