"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export default function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button className="btn-secondary auth-signout" onClick={handleSignOut} disabled={pending}>
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
