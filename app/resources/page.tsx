import Link from "next/link";

type ResourceCard = {
  title: string;
  description: string;
  href?: string;
  cta: string;
  sourceLabel: string;
  external?: boolean;
};

type ResourceSection = {
  id: string;
  title: string;
  intro: string;
  cards: ResourceCard[];
};

const sections: ResourceSection[] = [
  {
    id: "basics",
    title: "Digestive health basics",
    intro:
      "Start here if you want a broader overview of digestive conditions, symptoms, and how the digestive system works.",
    cards: [
      {
        title: "NIDDK digestive diseases",
        description:
          "A U.S. government health resource with patient-friendly information on digestive diseases, symptoms, and testing.",
        href: "https://www.niddk.nih.gov/health-information/digestive-diseases",
        cta: "Visit resource",
        sourceLabel: "NIDDK",
        external: true,
      },
      {
        title: "American Gastroenterological Association patient resources",
        description:
          "A leading GI organization with educational information and guidance related to digestive health and gastrointestinal care.",
        href: "https://gastro.org/patient-care/patient-resources/",
        cta: "Explore organization",
        sourceLabel: "AGA",
        external: true,
      },
    ],
  },
  {
    id: "ibs",
    title: "IBS and symptom support",
    intro:
      "For people trying to understand symptom patterns such as bloating, discomfort, urgency, and food-related flare-ups.",
    cards: [
      {
        title: "IFFGD",
        description:
          "A nonprofit focused on education and support for people living with gastrointestinal disorders, including IBS and other functional GI conditions.",
        href: "https://iffgd.org/",
        cta: "Visit resource",
        sourceLabel: "Nonprofit education",
        external: true,
      },
      {
        title: "NIDDK IBS resources",
        description:
          "A practical place to learn more about IBS symptoms, causes, diagnosis, and treatment discussions.",
        href: "https://www.niddk.nih.gov/health-information/digestive-diseases/irritable-bowel-syndrome",
        cta: "Learn more",
        sourceLabel: "Government health information",
        external: true,
      },
    ],
  },
  {
    id: "ibd",
    title: "IBD / Crohn's / ulcerative colitis",
    intro:
      "For people looking for support and educational resources related to Crohn's disease, ulcerative colitis, and inflammatory bowel disease.",
    cards: [
      {
        title: "Crohn's & Colitis Foundation",
        description:
          "A well-known organization offering education, support, and practical resources for people living with IBD.",
        href: "https://www.crohnscolitisfoundation.org/",
        cta: "Explore organization",
        sourceLabel: "Patient support organization",
        external: true,
      },
      {
        title: "NIDDK Crohn's disease information",
        description:
          "Government-backed educational information for understanding Crohn's disease and related digestive issues.",
        href: "https://www.niddk.nih.gov/health-information/digestive-diseases/crohns-disease",
        cta: "Learn more",
        sourceLabel: "Government health information",
        external: true,
      },
      {
        title: "NIDDK ulcerative colitis information",
        description:
          "A patient-friendly resource for learning more about ulcerative colitis, symptoms, and care discussions.",
        href: "https://www.niddk.nih.gov/health-information/digestive-diseases/ulcerative-colitis",
        cta: "Visit resource",
        sourceLabel: "Government health information",
        external: true,
      },
    ],
  },
  {
    id: "food-guidance",
    title: "Food guidance / low-FODMAP",
    intro:
      "For people exploring how certain foods may affect symptoms and looking for structured, evidence-informed food guidance.",
    cards: [
      {
        title: "Monash FODMAP",
        description:
          "One of the most widely referenced sources for low-FODMAP education and practical guidance around food triggers and symptom management.",
        href: "https://www.monashfodmap.com/",
        cta: "Visit resource",
        sourceLabel: "Food guidance",
        external: true,
      },
      {
        title: "How to notice food patterns without overcomplicating it",
        description:
          "A simple reminder that noticing patterns can start with basic meals, symptoms, and timing rather than an exhausting food diary.",
        cta: "Explore recipes",
        href: "/recipes",
        sourceLabel: "Well Emboweled support",
      },
    ],
  },
  {
    id: "professional-help",
    title: "Finding professional help",
    intro:
      "If symptoms are persistent, painful, severe, or confusing, professional guidance can help you get clearer answers.",
    cards: [
      {
        title: "When a gastroenterologist may help",
        description:
          "A gastroenterologist can help evaluate ongoing digestive symptoms, testing options, and treatment pathways.",
        cta: "Find providers",
        href: "/contact",
        sourceLabel: "Care guidance",
      },
      {
        title: "When a registered dietitian may help",
        description:
          "A registered dietitian, especially one familiar with digestive health, can help with meal planning, food triggers, and sustainable nutrition support.",
        href: "https://www.eatright.org/find-a-nutrition-expert",
        cta: "Explore organization",
        sourceLabel: "Professional help",
        external: true,
      },
      {
        title: "AGA patient resources",
        description:
          "A useful educational starting point if you want to better understand GI care and prepare for a conversation with a specialist.",
        href: "https://gastro.org/patient-care/patient-resources/",
        cta: "Learn more",
        sourceLabel: "GI education",
        external: true,
      },
    ],
  },
];

const quickLinks = [
  { href: "#basics", label: "Digestive health basics" },
  { href: "#ibs", label: "IBS and symptom support" },
  { href: "#ibd", label: "IBD / Crohn's / ulcerative colitis" },
  { href: "#food-guidance", label: "Food guidance / low-FODMAP" },
  { href: "#professional-help", label: "Finding professional help" },
];

export default function ResourcesPage() {
  return (
    <main className="shell space-y-8 py-6 sm:space-y-10 sm:py-10">
      <section className="panel grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">Resources</span>
          <h1 className="section-title">Trusted resources for digestive health</h1>
          <p className="max-w-2xl text-base leading-7 muted">
            This page gathers reputable organizations, educational resources, and practical starting
            points for people trying to better understand digestive symptoms, food sensitivities, IBS,
            IBD, and gut-health-related concerns.
          </p>
          <div className="rounded-[24px] bg-[var(--warm)]/55 p-5 text-sm leading-6 muted">
            Well Emboweled is a supportive platform for recipes, tools, and practical organization. It is
            not a substitute for medical care.
          </div>
        </div>

        <div className="panel-strong px-6 py-6">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Quick navigation
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full border border-[var(--border)] bg-white/72 px-4 py-2 text-sm hover:bg-white"
              >
                {link.label}
              </a>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 muted">
            Use these sections to find a practical starting point without having to sort through noisy or
            low-trust health content.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <InternalSupportCard
          title="Use recipes as a practical starting point"
          body="If you are trying to make eating feel more manageable, the public recipe library can be a helpful next step."
          ctaHref="/recipes"
          ctaLabel="Explore recipes"
        />
        <InternalSupportCard
          title="Private tools are coming together"
          body="Members will be able to save useful content, organize recipes, and build more personalized support over time."
          ctaHref="/signup"
          ctaLabel="Join members"
        />
      </section>

      <section className="space-y-5">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="panel scroll-mt-36 px-6 py-6 sm:px-8">
            <div className="max-w-3xl">
              <span className="eyebrow">{section.title}</span>
              <p className="mt-4 text-sm leading-6 muted sm:text-base">{section.intro}</p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {section.cards.map((card) => (
                <ResourceCard key={card.title} card={card} />
              ))}
            </div>
          </section>
        ))}
      </section>

      <section className="panel grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <h2 className="text-2xl font-semibold">Come back when you need a steadier starting point.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 muted sm:text-base">
            Use the recipe library for practical meal support, join members if you want to save useful content,
            and return here as more tools and educational materials are added.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <Link href="/recipes" className="btn-primary">
            Explore recipes
          </Link>
          <Link href="/signup" className="btn-secondary">
            Join members
          </Link>
        </div>
      </section>

      <section className="panel px-6 py-5 sm:px-8">
        <p className="text-sm leading-6 muted">
          Well Emboweled provides recipes, organization tools, and educational links to help users navigate
          gut-health-related concerns more practically. It is not a substitute for professional medical advice,
          diagnosis, or treatment.
        </p>
      </section>
    </main>
  );
}

function ResourceCard({ card }: { card: ResourceCard }) {
  const content = (
    <>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
        {card.sourceLabel}
      </div>
      <div className="mt-2 text-xl font-semibold">{card.title}</div>
      <p className="mt-2 text-sm leading-6 muted">{card.description}</p>
      <div className="mt-4 text-sm font-semibold text-[var(--accent-strong)]">
        {card.cta} {card.external ? <span aria-hidden="true">↗</span> : null}
      </div>
    </>
  );

  if (!card.href) {
    return <div className="rounded-[24px] border border-[var(--border)] bg-white/74 px-5 py-5">{content}</div>;
  }

  if (card.external) {
    return (
      <a
        href={card.href}
        target="_blank"
        rel="noreferrer"
        className="rounded-[24px] border border-[var(--border)] bg-white/74 px-5 py-5 hover:-translate-y-0.5"
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={card.href} className="rounded-[24px] border border-[var(--border)] bg-white/74 px-5 py-5 hover:-translate-y-0.5">
      {content}
    </Link>
  );
}

function InternalSupportCard({
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="panel px-6 py-6 sm:px-8">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 muted sm:text-base">{body}</p>
      <div className="mt-5">
        <Link href={ctaHref} className="btn-secondary px-4 py-2 text-sm">
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
