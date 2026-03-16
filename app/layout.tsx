import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import SiteChrome from "@/app/components/SiteChrome";

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
      <body className="text-[15px] antialiased">
        <SiteChrome isAuthenticated={!!user} userEmail={user?.email ?? null}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
