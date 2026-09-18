"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { localeFromPathname, withLocale } from "@/lib/i18n/locale";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import Link from "@/components/LocaleLink";

// Split out of app/[lang]/signup/page.tsx (upgrades/54-i18n-account-cluster.md)
// so the page itself can be a Server Component that fetches the dictionary
// via getDictionary() -- Client Components can't call next/root-params, so
// the translated strings come in as a prop instead.
export default function SignupForm({ dict }: { dict: Dictionary["account"]["signup"] }) {
  const router = useRouter();
  const locale = localeFromPathname(usePathname());
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName.trim() } },
    });

    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      // Email confirmation is disabled on this project — signUp already
      // returned a live session, so we're logged in immediately. The
      // ?welcome=1 param (not a persisted "has seen onboarding" flag --
      // this moment is already unambiguous) triggers WelcomeDialog once,
      // right after account creation.
      router.replace(withLocale(locale, "/dashboard?welcome=1"));
      router.refresh();
    } else {
      // Email confirmation is required — no session until the link is
      // clicked, so there's nothing to redirect into yet.
      setConfirmEmail(email);
    }
  }

  if (confirmEmail) {
    return (
      <div className="auth-page">
        <div className="card auth-form">
          <h1>{dict.checkEmailHeading}</h1>
          <p>
            {dict.checkEmailPrefix}
            <strong>{confirmEmail}</strong>
            {dict.checkEmailSuffix}
          </p>
          <Link href="/login">{dict.backToLogin}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="card auth-form" onSubmit={handleSubmit}>
        <h1>{dict.heading}</h1>
        <label>
          {dict.displayName}
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            minLength={2}
            maxLength={30}
            autoComplete="nickname"
          />
        </label>
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
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? dict.submitting : dict.submit}
        </button>
        <p className="auth-switch">
          {dict.haveAccount} <Link href="/login">{dict.logIn}</Link>
        </p>
      </form>
    </div>
  );
}
