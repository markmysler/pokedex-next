"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export default function SignupPage() {
  const router = useRouter();
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
      // returned a live session, so we're logged in immediately.
      router.replace("/");
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
          <h1>📬 Check your email</h1>
          <p>We sent a confirmation link to <strong>{confirmEmail}</strong>. Confirm your address, then log in.</p>
          <Link href="/login">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="card auth-form" onSubmit={handleSubmit}>
        <h1>🔴 Sign up</h1>
        <label>
          Display name
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
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
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
          {pending ? "Signing up…" : "Sign up"}
        </button>
        <p className="auth-switch">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
