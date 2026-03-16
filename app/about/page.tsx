import PublicInfoPage from "@/app/components/PublicInfoPage";

export default function AboutPage() {
  return (
    <PublicInfoPage
      eyebrow="About"
      title="A calmer, more human-centered gut health product"
      description="Gut Community is being built to help people notice patterns, reflect without guilt, and take small next steps. It should feel supportive and trustworthy without pretending to be medical authority."
      bullets={[
        "The experience is designed around low-friction reflection rather than overwhelming logging.",
        "Recipes and community support the product, but the app is centered on insight and action.",
        "The tone stays calm, non-judgmental, and grounded in explainable product decisions.",
      ]}
      ctaLabel="Join members"
      ctaHref="/signup"
    />
  );
}
