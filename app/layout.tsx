import "./globals.css";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./components/SignOutButton";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <html lang="en">
      <body>
        {/* Top navigation */}
        {user && (
          <header className="border-b">
            <nav className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="font-semibold">
                  Dashboard
                </Link>

                <Link href="/recipes" className="opacity-80 hover:opacity-100">
                  Recipes
                </Link>

                <Link
                  href="/recipes/new"
                  className="opacity-80 hover:opacity-100"
                >
                  Add Recipe
                </Link>
                <Link href="/forum" className="opacity-80 hover:opacity-100">
                  Forum
                </Link>
                <Link href="/settings/profile" className="opacity-80 hover:opacity-100">
                  Profile
                </Link>

                <Link
                  href="/recipes/saved"
                  className="opacity-80 hover:opacity-100"
                >
                  Saved
                </Link>
                <Link href="/admin/users" className="opacity-80 hover:opacity-100">
                  Admin
                </Link>

              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm opacity-70 hidden sm:inline">
                  {user.email}
                </span>
                <SignOutButton />
              </div>
            </nav>
          </header>
        )}

        <main>{children}</main>
      </body>
    </html>
  );
}
