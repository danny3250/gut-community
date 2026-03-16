import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignupForm from "@/app/components/SignupForm";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <main className="shell py-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="panel px-6 py-8 sm:px-8">
          <span className="eyebrow">New membership</span>
          <h1 className="mt-4 text-4xl font-semibold">Create your Well Emboweled account</h1>
          <p className="mt-4 text-sm leading-6 muted">
            Start with the member basics now and leave room for future subscriptions, saved content,
            and premium wellness features.
          </p>
          <div className="mt-8 space-y-3 text-sm leading-6 muted">
            <p>Join the recipe library, private forum, and profile-based community experience.</p>
            <p>Once you sign up, you&apos;ll verify your email before continuing into the app.</p>
          </div>
        </section>

        <section className="panel-strong px-6 py-8 sm:px-8">
          <SignupForm />
        </section>
      </div>
    </main>
  );
}
