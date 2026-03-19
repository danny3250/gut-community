import {
  CAREBRIDGE_POLICY_LAST_UPDATED,
  CAREBRIDGE_SUPPORT_EMAIL,
  CAREBRIDGE_PRIVACY_VERSION,
} from "@/lib/carebridge/policies";

const sections = [
  {
    title: "1. Overview",
    body: [
      "CareBridge (\"we,\" \"us,\" or \"our\") is a healthcare coordination and provider connection platform designed to help users discover providers, manage appointments, track health-related information, and communicate with providers.",
      "We take your privacy seriously and are committed to protecting your personal and health-related information.",
    ],
  },
  {
    title: "2. Important Notice About Healthcare Data",
    body: [
      "CareBridge may collect and process health-related information, including information you provide during daily check-ins, appointment interactions, messaging with providers, document uploads, and provider-generated follow-ups.",
      "Depending on how CareBridge is used, we may act as a service provider to healthcare professionals or a consumer-facing platform. This distinction may affect how privacy laws, including HIPAA, apply.",
    ],
  },
  {
    title: "3. Information We Collect",
    body: [
      "A. Account Information: Name, email address, and login credentials.",
      "B. Health & Wellness Data (User-Provided): Symptoms, conditions, daily check-ins such as mood, stress, sleep, and food intake, and health-related notes.",
      "C. Provider Interaction Data: Appointment details, messages between patients and providers, provider-created follow-ups and summaries, and care-related metadata such as timestamps and visit duration.",
      "D. Documents & Uploads: Forms, images, PDFs, and other files uploaded by users or providers.",
      "E. Provider Information: Professional details, licensure states where applicable, specialties and treatment scope, and verification status.",
      "F. Usage & Technical Data (only if implemented): Device or browser type, IP address, and basic usage logs.",
    ],
  },
  {
    title: "4. How We Use Information",
    body: [
      "We use your information to provide and operate the CareBridge platform, connect patients with providers, facilitate appointments and communication, generate provider-reviewed follow-ups, display relevant health insights to users, improve system performance and features, and maintain system security and integrity.",
      "We do not sell your personal or health information.",
    ],
  },
  {
    title: "5. Provider Notes vs Patient Summaries",
    body: [
      "CareBridge separates private provider notes, which are visible only to the provider and not shared with patients, from patient-facing follow-ups, which are written or approved by providers, visible to patients, and may include care guidance or summaries.",
    ],
  },
  {
    title: "6. Sharing of Information",
    body: [
      "A. With Providers: We may share information when you interact with or book a provider to enable care coordination and communication.",
      "B. With Service Providers: We may use trusted third-party vendors to operate the platform, including hosting and database services, file storage, and email or notification services. These providers are required to protect your data.",
      "C. Legal Requirements: We may disclose information if required by law, court order, or regulatory authority.",
    ],
  },
  {
    title: "7. Telehealth & Provider Interactions",
    body: [
      "CareBridge enables connections between users and providers.",
      "Providers are responsible for clinical decisions and care. CareBridge does not provide medical advice and does not guarantee provider availability or treatment outcomes.",
    ],
  },
  {
    title: "8. AI & Automated Features (If Applicable)",
    body: [
      "CareBridge may include AI-assisted features to support summarization, data organization, and workflow assistance.",
      "AI outputs are not medical advice. AI-generated content is reviewed or controlled before being shared with patients, and AI is not used as a substitute for licensed medical professionals.",
    ],
  },
  {
    title: "9. Data Security",
    body: [
      "We implement reasonable safeguards to protect your information, including access controls, role-based permissions, secure storage practices, and audit logging of sensitive actions.",
      "However, no system can be guaranteed to be 100% secure.",
    ],
  },
  {
    title: "10. Data Retention",
    body: [
      "We retain information as long as necessary to provide services, comply with legal obligations, resolve disputes, and enforce agreements.",
      "Retention policies may evolve as the platform grows.",
    ],
  },
  {
    title: "11. Your Rights",
    body: [
      "Depending on applicable laws, you may have the right to access your data, request corrections, request deletion where legally permitted, and export your information.",
      `Requests can be submitted to ${CAREBRIDGE_SUPPORT_EMAIL}.`,
    ],
  },
  {
    title: "12. Account & Access Controls",
    body: [
      "Users control their own accounts and login credentials. Providers must be approved before accessing provider features. Access to sensitive data is restricted based on user role.",
    ],
  },
  {
    title: "13. Children's Privacy",
    body: [
      "CareBridge is not intended for children under 13 without parental or guardian involvement.",
    ],
  },
  {
    title: "14. Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time. Updates will be reflected by the “Last Updated” date.",
    ],
  },
  {
    title: "15. Contact",
    body: [
      `If you have questions about this Privacy Policy, contact ${CAREBRIDGE_SUPPORT_EMAIL}.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="shell max-w-5xl space-y-8 py-8 sm:py-12">
      <section className="space-y-5">
        <span className="eyebrow">Privacy Policy</span>
        <h1 className="text-4xl font-semibold sm:text-5xl">CareBridge Privacy Policy ({CAREBRIDGE_PRIVACY_VERSION})</h1>
        <p className="text-sm leading-6 muted">Last Updated: {CAREBRIDGE_POLICY_LAST_UPDATED}</p>
        <p className="max-w-3xl text-sm leading-7 muted">
          This policy explains how CareBridge handles personal, operational, and health-related information across
          public content, authenticated workflows, provider interactions, and patient-support features.
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
