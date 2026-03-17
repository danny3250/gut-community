const faqs = [
  {
    question: "Is CareBridge only for telehealth?",
    answer: "No. Telehealth is an important part of the platform, but CareBridge also includes public resources, patient portal features, provider workflows, and community support.",
  },
  {
    question: "Are resources and articles public?",
    answer: "Yes. Public education, resources, and supportive content remain available without signing in.",
  },
  {
    question: "Does CareBridge replace medical advice?",
    answer: "No. The platform is designed to make care easier to reach and organize, not to replace professional judgment or emergency care.",
  },
  {
    question: "Can providers use CareBridge too?",
    answer: "Yes. The product is being structured for patient, provider, and admin workflows, including scheduling and telehealth-ready visit flows.",
  },
];

export default function FaqPage() {
  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <section className="panel px-6 py-8 sm:px-8">
        <span className="eyebrow">FAQ</span>
        <h1 className="mt-4 text-4xl font-semibold">Questions people may have as CareBridge takes shape.</h1>
        <div className="mt-6 grid gap-4">
          {faqs.map((item) => (
            <div key={item.question} className="rounded-[24px] border border-[var(--border)] bg-white/72 px-5 py-5">
              <div className="text-xl font-semibold">{item.question}</div>
              <p className="mt-2 text-sm leading-6 muted">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
