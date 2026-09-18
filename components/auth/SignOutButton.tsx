"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { localeFromPathname, withLocale } from "@/lib/i18n/locale";
import type { Dictionary } from "@/lib/i18n/getDictionary";

interface SignOutButtonProps {
  dict: Pick<Dictionary["common"], "signOut" | "signingOut">;
}

export default function SignOutButton({ dict }: SignOutButtonProps) {
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
      {pending ? dict.signingOut : dict.signOut}
    </button>
  );
}
