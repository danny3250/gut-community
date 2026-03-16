import PublicInfoPage from "@/app/components/PublicInfoPage";

export default function NewsPage() {
  return (
    <PublicInfoPage
      eyebrow="Gut health news"
      title="Thoughtful articles and updates, not an empty content farm"
      description="Use this area for useful, trustworthy updates about gut health, digestion, habits, and day-to-day coping. The goal is credibility and clarity, not spammy wellness copy."
      bullets={[
        "Editorial pieces should help users feel informed, not sold to.",
        "Future articles can connect back to member app insights and recipe support.",
        "The visual treatment should stay calm and premium rather than looking like a generic blog grid.",
      ]}
      ctaLabel="Explore recipes"
      ctaHref="/recipes"
    />
  );
}
