import Link from "next/link";
import PublicBrandMark from "@/app/components/PublicBrandMark";
import { BRAND } from "@/lib/config/brand";

const storySections = [
  {
    title: "Why CareBridge exists",
    paragraphs: [
      `${BRAND.name} was created to reduce the friction that so often shows up between someone realizing they need care and actually getting that care. People frequently have to move between provider directories, scheduling systems, patient paperwork, telehealth links, follow-up notes, reminders, and educational content without any one place helping those pieces work together clearly. ${BRAND.name} brings those moments into one calmer experience so the path forward feels more understandable from the start.`,
      `The platform is designed for real healthcare workflows rather than one narrow use case. That means helping patients prepare for visits, helping providers stay organized between appointments, and helping both sides return to the same shared context after the visit is over. The goal is not to add another portal for the sake of having one. The goal is to make the steps around care feel easier to follow, easier to return to, and easier to act on.`,
    ],
  },
  {
    title: "How the platform supports people",
    paragraphs: [
      `${BRAND.name} combines public education, provider discovery, appointment booking, telehealth-ready visit workflows, daily health check-ins, patient-facing follow-up summaries, and role-based workspaces for patients, providers, and administrators. Public visitors can explore providers, resources, recipes, and community content without being forced into an account immediately. Once someone signs in, the experience becomes more tailored to the work they actually need to do.`,
      `For patients, that can mean finding care, preparing for visits, tracking patterns, reviewing follow-up instructions, and returning to important documents in one place. For providers, it means a workspace that supports appointments, notes, patient insights, communication, and continuity over time. For administrators, it means clearer oversight of operations, provider verification, content, and platform activity. Each part of the product is meant to feel connected without making every user live inside the same navigation or the same workflow.`,
    ],
  },
  {
    title: "What makes the experience different",
    paragraphs: [
      `A lot of healthcare software feels either too clinical, too fragmented, or too generic to be genuinely useful. ${BRAND.name} takes a different approach by treating clarity as part of the product itself. The interface is meant to be calm, readable, and role-aware. The product language aims to be supportive without becoming vague, and structured without becoming intimidating. That is why the platform keeps public guidance open, keeps provider documentation separate from patient-facing follow-up, and keeps each workspace focused on the tasks that matter in that role.`,
      `The broader vision is healthcare access that feels coordinated rather than scattered. That includes in-person care, telehealth, educational resources, wellness support, recipes, community discussion, and ongoing follow-up. Gut health can remain one supported area among many, but the platform as a whole is built to support broader healthcare access and continuity. Over time, that foundation makes it possible to offer stronger recommendations, clearer preparation tools, and more connected patient-provider relationships without making the experience heavier or harder to use.`,
    ],
  },
];

export default function AboutPage() {
  return (
    <main className="shell space-y-10 py-6 sm:space-y-14 sm:py-10">
      <PublicBrandMark />

      <section className="relative -mt-[13.5rem] lg:-mt-[17rem]">
        <div className="grid gap-10 pt-3 lg:grid-cols-[24rem_minmax(0,1fr)] lg:items-start lg:gap-12">
          <aside className="hidden lg:block" aria-hidden="true" />

          <div className="lg:-mt-34" />
        </div>
      </section>

      <section className="-mt-3 sm:-mt-5 lg:-mt-10">
        <div className="max-w-6xl space-y-12">
          <div className="space-y-5">
            <h2 className="max-w-5xl text-4xl font-semibold sm:text-5xl">
              A healthcare access platform built to make the path to care feel simpler, calmer, and easier to return to.
            </h2>

            <p className="max-w-6xl text-base leading-8 muted">
              {BRAND.name} brings together provider discovery, scheduling, telehealth-ready visits, follow-up,
              supportive resources, and role-based workspaces so patients and providers can spend less energy
              navigating disconnected systems.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/services" className="btn-primary">
                Explore services
              </Link>
              <Link href="/providers" className="btn-secondary">
                Browse providers
              </Link>
            </div>
          </div>

          <div className="space-y-3 border-t border-[var(--border)] pt-6 text-sm leading-7 muted sm:text-base">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              What this page covers
            </div>
            <p>Start here if you want the bigger picture of what CareBridge is meant to do.</p>
            <p>The focus is on how the product reduces friction around care for patients, providers, and the teams supporting them.</p>
            <p>From this point down, the story uses the page width more naturally so the description can continue without being trapped in the original right-column layout.</p>
          </div>

          {storySections.map((section) => (
            <div key={section.title} className="space-y-5 border-t border-[var(--border)] pt-6 first:border-t-0 first:pt-0">
              <div>
                <span className="eyebrow">{section.title}</span>
                <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">{section.title}</h2>
              </div>

              <div className="grid gap-5 text-base leading-8 muted">
                {section.paragraphs.map((paragraph) => (
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
