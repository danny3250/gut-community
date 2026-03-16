"use client";

import { useState } from "react";

const feelingOptions = ["Fine", "Meh", "Rough"] as const;
const symptomOptions = ["Bloating", "Pain", "Gas", "Bathroom issues", "Reflux", "Fatigue"] as const;
const contextPrompts = [
  {
    label: "Stress level",
    description: "Keep this broad and low effort.",
    options: ["Low", "Medium", "High"],
  },
  {
    label: "Meal timing",
    description: "Late meals can be a useful pattern to test.",
    options: ["Earlier", "Usual", "Late"],
  },
  {
    label: "Food context",
    description: "Use categories instead of detailed food logging.",
    options: ["Gentle foods", "Mixed day", "Trigger-y day"],
  },
] as const;

export default function CheckInPage() {
  const [feeling, setFeeling] = useState<(typeof feelingOptions)[number] | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [context, setContext] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const contextPrompt = contextPrompts[new Date().getDate() % contextPrompts.length];
  const needsFollowUp = feeling === "Meh" || feeling === "Rough";

  function toggleSymptom(symptom: string) {
    setSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((item) => item !== symptom) : [...prev, symptom]
    );
  }

  function submitCheckIn() {
    setSubmitted(true);
  }

  return (
    <>
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-4">
          <span className="eyebrow">Daily gut check</span>
          <h1 className="section-title">A low-burden daily reflection</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            The goal is to capture useful signal without turning this into a food diary or a guilt loop.
            A fast check-in is better than a perfect one.
          </p>
        </div>

        <div className="panel-strong px-5 py-5">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Design principle
          </div>
          <p className="mt-3 text-sm leading-6 muted">
            Missing days should never feel punitive. This flow is designed to welcome people back and keep
            going with partial data.
          </p>
        </div>
      </section>

      <section className="panel px-6 py-6 sm:px-8">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          Step 1
        </div>
        <h2 className="mt-2 text-2xl font-semibold">How did your gut feel today?</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          {feelingOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setFeeling(option);
                setSubmitted(false);
              }}
              className={
                feeling === option
                  ? "btn-primary px-5 py-3"
                  : "btn-secondary px-5 py-3"
              }
            >
              {option}
            </button>
          ))}
        </div>

        {needsFollowUp && (
          <div className="mt-8 space-y-4">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Step 2
            </div>
            <h3 className="text-xl font-semibold">What stood out?</h3>
            <div className="flex flex-wrap gap-3">
              {symptomOptions.map((symptom) => {
                const active = symptoms.includes(symptom);
                return (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() => toggleSymptom(symptom)}
                    className={
                      active
                        ? "rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                        : "rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm"
                    }
                  >
                    {symptom}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {feeling && (
          <div className="mt-8 space-y-4">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Step 3
            </div>
            <h3 className="text-xl font-semibold">{contextPrompt.label}</h3>
            <p className="text-sm muted">{contextPrompt.description}</p>
            <div className="flex flex-wrap gap-3">
              {contextPrompt.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setContext(option)}
                  className={
                    context === option
                      ? "rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                      : "rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm"
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={submitCheckIn}
            disabled={!feeling}
          >
            Save today&apos;s check-in
          </button>
          <div className="text-sm muted">Keep it simple. You can always add more signal later.</div>
        </div>

        {submitted && (
          <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-white/70 px-4 py-4 text-sm leading-6">
            Thanks. Today&apos;s entry is framed as a calm daily reflection. The next step is wiring this UI to
            persistent history and rule-based analysis.
          </div>
        )}
      </section>
    </>
  );
}
