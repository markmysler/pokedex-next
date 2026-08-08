# Step 6: HSTS + security headers

## Why here

Raised as "passwords are sent as plaintext over the network" — worth
stating plainly what's actually true before building anything: it isn't.
Login/signup call Supabase's Auth API (`signInWithPassword`/`signUp`)
directly from the browser against `https://<project>.supabase.co`; that
request never passes through this app's own server, and both that URL and
the Vercel deployment are always HTTPS/TLS. A network sniffer between the
client and Supabase sees only encrypted TLS traffic, never the plaintext
password — the same protection every login form on the web relies on.
Client-side pre-hashing before sending wouldn't add real security here (TLS
already covers the wire) and would actively fight Supabase's own
server-side password hashing, which expects the real password.

What this step actually is: defense-in-depth, not a fix for a real gap —
headers that make the browser itself refuse to ever fall back to plain
HTTP for this origin (even by accident, e.g. a stray `http://` link), plus
a few other cheap, standard hardening headers.

## What changes

- `next.config.ts`'s `headers()` gains a new global rule (`source:
  "/:path*"`, alongside the existing `/images/:path*` cache-control rule)
  adding:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains` — once
    a browser has loaded this site over HTTPS once, it refuses plain HTTP
    for two years. (Not `preload` — that requires submitting the domain to
    browsers' hardcoded preload list, a one-way, hard-to-reverse step out
    of scope for this app; skip unless specifically requested later.)
  - `X-Content-Type-Options: nosniff` — stops browsers from guessing
    content types in a way that can be abused.
  - `X-Frame-Options: DENY` — this app has no legitimate reason to be
    embedded in an iframe; blocks clickjacking-style embedding.
  - `Referrer-Policy: strict-origin-when-cross-origin` — a sane default,
    avoids leaking full URLs (which could include query params) to
    third-party sites via the Referer header.
- No application code changes — this is entirely response headers.

### Known caveat, not a blocker
`next dev` serves `http://localhost:3000`. Setting `Strict-Transport-Security`
applies in dev too, but browsers special-case `localhost` and don't enforce
HSTS against it, so this doesn't lock local development out of plain HTTP.
Worth knowing, not worth working around.

## End state

- [ ] `curl -I` (or equivalent) against the deployed app shows
      `Strict-Transport-Security`, `X-Content-Type-Options`,
      `X-Frame-Options`, and `Referrer-Policy` on every route, not just
      `/images/*`.
- [ ] The existing `/images/:path*` `Cache-Control` header is untouched.
- [ ] Login/signup still work exactly as before — this step changes no
      request/response bodies, only headers.
- [ ] `npm run build` / `npm run lint` clean.
