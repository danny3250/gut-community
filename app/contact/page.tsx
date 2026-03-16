import PublicInfoPage from "@/app/components/PublicInfoPage";

export default function ContactPage() {
  return (
    <PublicInfoPage
      eyebrow="Contact and support"
      title="A clear, reassuring support experience"
      description="Use this page for help requests, account issues, and future support channels. Even before a full support system is built, the page should feel intentional and trustworthy."
      bullets={[
        "Good place for simple support forms, accessibility help, and member assistance.",
        "Support language should stay warm and practical instead of corporate or clinical.",
        "This can grow into FAQs, ticketing links, and account recovery guidance over time.",
      ]}
      ctaLabel="Open member app"
      ctaHref="/app"
    />
  );
}
