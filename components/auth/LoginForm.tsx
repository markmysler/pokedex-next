"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { localeFromPathname, withLocale } from "@/lib/i18n/locale";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import Link from "@/components/LocaleLink";

// Split out of app/[lang]/login/page.tsx (upgrades/54-i18n-account-cluster.md)
// so the page itself can be a Server Component that fetches the dictionary
// via getDictionary() -- Client Components can't call next/root-params, so
// the translated strings come in as a prop instead.
export default function LoginForm({ dict }: { dict: Dictionary["account"]["login"] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = localeFromPathname(usePathname());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }

    router.replace(withLocale(locale, searchParams.get("next") || "/"));
    router.refresh();
  }

  return (
    <div className="auth-page">
      <form className="card auth-form" onSubmit={handleSubmit}>
        <h1>{dict.heading}</h1>
        <label>
          {dict.email}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          {dict.password}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? dict.submitting : dict.submit}
        </button>
        <p className="auth-switch">
          {dict.noAccount} <Link href="/signup">{dict.signUp}</Link>
        </p>
      </form>
    </div>
  );
}
