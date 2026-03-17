export type ResourceEntry = {
  title: string;
  description: string;
  href: string;
  source: string;
};

export type ResourceCategory = {
  id: string;
  title: string;
  description: string;
  entries: ResourceEntry[];
};

export const resourceCategories: ResourceCategory[] = [
  {
    id: "care-prep",
    title: "Preparing for care",
    description:
      "Helpful starting points for understanding symptoms, preparing questions, and getting more from a medical visit.",
    entries: [
      {
        title: "Preparing for a doctor visit",
        description: "Patient guidance for gathering symptoms, medications, and questions before an appointment.",
        href: "https://www.niddk.nih.gov/health-information/diagnostic-tests/preparing-doctor-visit",
        source: "NIDDK",
      },
      {
        title: "Patient resources",
        description: "A broad set of patient-facing educational resources from a major gastroenterology organization.",
        href: "https://gastro.org/patient-care/patient-resources/",
        source: "American Gastroenterological Association",
      },
    ],
  },
  {
    id: "telehealth",
    title: "Telehealth and remote care",
    description:
      "Resources that help patients understand remote care, virtual appointments, and how to prepare for them.",
    entries: [
      {
        title: "Telehealth information for patients",
        description: "General patient-facing guidance about telehealth use and virtual care expectations.",
        href: "https://telehealth.hhs.gov/patients",
        source: "HHS Telehealth",
      },
      {
        title: "Preparing for telehealth",
        description: "Practical guidance for getting ready for a telehealth visit and asking better questions.",
        href: "https://telehealth.hhs.gov/patients/preparing-for-a-telehealth-visit",
        source: "HHS Telehealth",
      },
    ],
  },
  {
    id: "chronic-support",
    title: "Chronic condition and support organizations",
    description:
      "Trusted organizations for people living with chronic conditions who need education, advocacy, and support options.",
    entries: [
      {
        title: "Crohn's & Colitis Foundation",
        description: "A leading support organization for IBD education, programs, and patient resources.",
        href: "https://www.crohnscolitisfoundation.org/",
        source: "Crohn's & Colitis Foundation",
      },
      {
        title: "IFFGD digestive disorder resources",
        description: "Patient-friendly information for digestive health concerns and symptom support.",
        href: "https://iffgd.org/",
        source: "IFFGD",
      },
    ],
  },
  {
    id: "wellness-support",
    title: "Food, digestion, and supportive wellness guidance",
    description:
      "Supportive educational material and food-related references that can sit alongside clinical care without replacing it.",
    entries: [
      {
        title: "Monash FODMAP",
        description: "A trusted source for learning about low-FODMAP approaches and food guidance.",
        href: "https://www.monashfodmap.com/",
        source: "Monash University",
      },
      {
        title: "Find a Nutrition Expert",
        description: "A directory to help people find a registered dietitian nutritionist when food support needs professional guidance.",
        href: "https://www.eatright.org/find-a-nutrition-expert",
        source: "Academy of Nutrition and Dietetics",
      },
    ],
  },
];

export const homepageResourcePreview = [
  {
    title: "Preparing for a visit",
    description: "Helpful guidance for questions, intake details, and getting more from an appointment.",
    href: "https://www.niddk.nih.gov/health-information/diagnostic-tests/preparing-doctor-visit",
    source: "NIDDK",
  },
  {
    title: "Telehealth support",
    description: "Practical information for understanding and preparing for remote care.",
    href: "https://telehealth.hhs.gov/patients/preparing-for-a-telehealth-visit",
    source: "HHS Telehealth",
  },
  {
    title: "Nutrition support",
    description: "A reliable starting point for finding a dietitian when food support needs professional help.",
    href: "https://www.eatright.org/find-a-nutrition-expert",
    source: "Academy of Nutrition and Dietetics",
  },
];
