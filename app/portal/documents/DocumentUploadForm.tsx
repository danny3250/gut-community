"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DOCUMENT_CATEGORIES } from "@/lib/carebridge/forms";

type AppointmentOption = {
  id: string;
  label: string;
};

export default function DocumentUploadForm({
  appointmentId = "",
  appointmentOptions = [],
}: {
  appointmentId?: string;
  appointmentOptions?: AppointmentOption[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState<(typeof DOCUMENT_CATEGORIES)[number]>("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkedAppointmentId, setLinkedAppointmentId] = useState(appointmentId);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setMessage("Please choose a file to upload.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("appointmentId", linkedAppointmentId);

    const response = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Could not upload document.");
      return;
    }

    setFile(null);
    setTitle("");
    setDescription("");
    setLinkedAppointmentId(appointmentId);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="panel px-6 py-6 sm:px-8">
      <span className="eyebrow">Upload document</span>
      <h2 className="mt-4 text-2xl font-semibold">Add a file for your provider to review.</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <div className="mb-2 font-medium">Category</div>
          <select
            className="field"
            value={category}
            onChange={(event) => setCategory(event.target.value as (typeof DOCUMENT_CATEGORIES)[number])}
          >
            {DOCUMENT_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <div className="mb-2 font-medium">Link to appointment (optional)</div>
          <select className="field" value={linkedAppointmentId} onChange={(event) => setLinkedAppointmentId(event.target.value)}>
            <option value="">Not linked to a specific appointment</option>
            {appointmentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <div className="mb-2 font-medium">Title</div>
          <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="text-sm">
          <div className="mb-2 font-medium">Description</div>
          <input className="field" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
      </div>
      <label className="mt-4 block text-sm">
        <div className="mb-2 font-medium">File</div>
        <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      </label>
      <p className="mt-3 text-sm leading-6 muted">
        Upload PDF, PNG, JPG, or WebP files up to 10 MB. Documents stay private and are only shared with authorized care team members.
      </p>
      {message ? <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/70 p-3 text-sm">{message}</div> : null}
      <div className="mt-5">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Uploading..." : "Upload document"}
        </button>
      </div>
    </form>
  );
}
