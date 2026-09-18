"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { localeFromPathname, withLocale } from "@/lib/i18n/locale";

export default function SignOutButton() {
  const router = useRouter();
  const locale = localeFromPathname(usePathname());
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace(withLocale(locale, "/login"));
    router.refresh();
  }

  return (
    <button className="btn-secondary auth-signout" onClick={handleSignOut} disabled={pending}>
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
