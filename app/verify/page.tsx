import Link from "next/link";

export default function VerifyPage() {
  return (
    <main className="shell py-8 sm:py-12">
      <section className="panel mx-auto max-w-3xl px-6 py-8 text-center sm:px-8">
        <span className="eyebrow">Check your inbox</span>
        <h1 className="mt-4 text-4xl font-semibold">Verify your email</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 muted">
          We sent a confirmation link to the email address you used during sign-up. Open that link,
          then come back here and sign in to continue.
        </p>
        <div className="mt-6">
          <Link href="/login" className="btn-primary">
            Continue to login
          </Link>
        </div>
      </section>
    </main>
  );
}
