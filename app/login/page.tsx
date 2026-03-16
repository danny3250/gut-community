import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/app/components/LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <main className="shell py-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="panel px-6 py-8 sm:px-8">
          <span className="eyebrow">Member access</span>
          <h1 className="mt-4 text-4xl font-semibold">Sign in to your account</h1>
          <p className="mt-4 text-sm leading-6 muted">
            Return to your recipes, community discussions, and profile settings.
          </p>
          <div className="mt-8 rounded-[24px] bg-[var(--warm)]/60 p-5 text-sm leading-6 muted">
            This sign-in flow is already wired to Supabase auth, so it is a good base for future paid
            member areas and gated content.
          </div>
        </section>

        <section className="panel-strong px-6 py-8 sm:px-8">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
