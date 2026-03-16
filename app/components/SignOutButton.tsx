"use client";

import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function SignOutButton() {
  const router = useRouter();

  return (
    <button
      className="btn-secondary"
      onClick={async () => {
        const supabase = createSupabaseClient();
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Logout
    </button>
  );
}
