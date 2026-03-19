const sections = [
  {
    title: "1. Acceptance of Terms",
    body: [
      "By accessing or using CareBridge (\"the Platform\"), you agree to these Terms & Conditions.",
      "If you do not agree, do not use the platform.",
    ],
  },
  {
    title: "2. What CareBridge Is",
    body: [
      "CareBridge is a platform that allows users to discover and connect with healthcare providers, schedule and manage appointments, communicate with providers, track health-related information, and receive provider-created follow-ups.",
    ],
  },
  {
    title: "3. What CareBridge Is NOT (Important)",
    body: [
      "CareBridge is not a healthcare provider, does not provide medical advice, does not diagnose or treat conditions, and does not guarantee outcomes.",
      "All medical care is provided solely by licensed providers.",
    ],
  },
  {
    title: "4. User Accounts",
    body: [
      "You agree to provide accurate information, keep your login credentials secure, and not share your account.",
      "You are responsible for all activity under your account.",
    ],
  },
  {
    title: "5. Provider Accounts",
    body: [
      "Providers must be approved by an administrator before accessing provider features and must provide accurate licensure and professional information.",
      "Providers are solely responsible for patient care, clinical decisions, and compliance with applicable laws.",
      "CareBridge may suspend or revoke provider access at any time.",
    ],
  },
  {
    title: "6. Platform Use Rules",
    body: [
      "You agree not to misuse the platform, upload illegal or harmful content, impersonate others, attempt to bypass system protections, or use the platform for unauthorized commercial purposes.",
    ],
  },
  {
    title: "7. Appointments & Telehealth",
    body: [
      "CareBridge facilitates appointments but does not control provider availability, does not guarantee appointment fulfillment, and is not responsible for missed, canceled, or delayed appointments.",
      "Providers are responsible for telehealth sessions and care delivery.",
    ],
  },
  {
    title: "8. Messaging & Communication",
    body: [
      "Messaging between users and providers is provided for convenience.",
      "You agree not to use messaging for emergencies and not to rely on messaging for urgent medical needs.",
    ],
  },
  {
    title: "9. Emergency Disclaimer",
    body: [
      "If you are experiencing a medical emergency, call 911 or seek immediate care.",
      "CareBridge is not an emergency service.",
    ],
  },
  {
    title: "10. Provider Notes & Follow-Ups",
    body: [
      "Providers may create private notes not visible to patients. Providers may also create patient-facing follow-ups, and patients will only see information intentionally shared with them.",
    ],
  },
  {
    title: "11. User-Provided Data",
    body: [
      "You are responsible for the accuracy of information you submit and the content you upload.",
      "You grant CareBridge permission to store and process your data as described in the Privacy Policy.",
    ],
  },
  {
    title: "12. Documents & Uploads",
    body: [
      "You agree not to upload illegal content, harmful files, or content you do not have rights to.",
      "CareBridge may remove content at its discretion.",
    ],
  },
  {
    title: "13. Intellectual Property",
    body: [
      "All platform content, design, and functionality belong to CareBridge unless otherwise stated.",
      "You may not copy, reproduce, or redistribute platform content without permission.",
    ],
  },
  {
    title: "14. AI-Assisted Features",
    body: [
      "CareBridge may include AI-assisted features.",
      "AI outputs are not medical advice, AI is used as a support tool only, and providers are responsible for reviewing patient-facing content.",
    ],
  },
  {
    title: "15. Privacy",
    body: [
      "Your use of CareBridge is also governed by our Privacy Policy.",
    ],
  },
  {
    title: "16. Suspension & Termination",
    body: [
      "We may suspend or terminate accounts if terms are violated, misuse is detected, or required by law.",
      "Providers may lose access if verification status changes or compliance issues arise.",
    ],
  },
  {
    title: "17. Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, CareBridge is not liable for medical outcomes, provider actions or decisions, missed appointments, data loss, or service interruptions.",
      "Use of the platform is at your own risk.",
    ],
  },
  {
    title: "18. Indemnification",
    body: [
      "You agree to indemnify and hold CareBridge harmless from claims arising from your use of the platform, violations of these Terms, or misuse of services.",
    ],
  },
  {
    title: "19. Availability",
    body: [
      "We do not guarantee uninterrupted service or error-free operation.",
      "The platform may be updated or changed at any time.",
    ],
  },
  {
    title: "20. Geographic Scope",
    body: [
      "CareBridge is intended for use in the United States.",
      "Users and providers are responsible for complying with local laws.",
    ],
  },
  {
    title: "21. Changes to Terms",
    body: [
      "We may update these Terms at any time.",
      "Continued use of the platform means you accept updated Terms.",
    ],
  },
  {
    title: "22. Governing Law",
    body: [
      "These Terms are governed by the laws of: [Your State — fill this in].",
    ],
  },
  {
    title: "23. Contact",
    body: [
      "For questions: support@CareBridge.com",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="shell max-w-5xl space-y-8 py-8 sm:py-12">
      <section className="space-y-5">
        <span className="eyebrow">Terms & Conditions</span>
        <h1 className="text-4xl font-semibold sm:text-5xl">CareBridge Terms & Conditions (v1)</h1>
        <p className="text-sm leading-6 muted">Last Updated: March 19, 2026</p>
        <p className="max-w-3xl text-sm leading-7 muted">
          These terms describe the rules, boundaries, and responsibilities that apply when users, providers, and
          organizations access CareBridge.
        </p>
      </section>

      <section className="workspace-section">
        <div className="grid gap-8">
          {sections.map((section) => (
            <div key={section.title} className="data-row first:border-t-0">
              <h2 className="text-2xl font-semibold">{section.title}</h2>
              <div className="mt-4 grid gap-3 text-sm leading-7 muted sm:text-base">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
