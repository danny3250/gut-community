import PublicInfoPage from "@/app/components/PublicInfoPage";

export default function ResourcesPage() {
  return (
    <PublicInfoPage
      eyebrow="Resources"
      title="Useful links and support resources people can return to"
      description="This section is meant for curated, practical references that help users feel safer and more supported as they learn about symptoms, routines, and food patterns."
      bullets={[
        "Great for structured guides, vetted links, and simple help articles.",
        "Should feel organized and easy to scan on both desktop and mobile.",
        "A good home for future FAQ content and onboarding-friendly support pages.",
      ]}
      ctaLabel="Contact support"
      ctaHref="/contact"
    />
  );
}
