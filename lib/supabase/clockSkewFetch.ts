const CLOCK_SKEW_RETRIES = 2;
const CLOCK_SKEW_DELAY_MS = 500;

// Supabase occasionally answers a request with 401 "JWT issued at future"
// (PostgREST code PGRST303): the token its gateway issued for the secret key
// is a moment ahead of the database host's clock. It happened on the first
// page load after a while away, crashing the whole page until a refresh.
// The request is rejected before it runs, so retrying it after the clocks
// catch up is safe for any method.
export async function fetchWithClockSkewRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  baseFetch: typeof fetch = fetch,
  delayMs: number = CLOCK_SKEW_DELAY_MS
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await baseFetch(input, init);
    if (response.status !== 401 || attempt >= CLOCK_SKEW_RETRIES) return response;
    const body = await response.clone().text();
    if (!body.includes("PGRST303") && !body.includes("issued at future")) return response;
    console.warn(`Supabase clock skew (JWT issued at future), retry ${attempt + 1}/${CLOCK_SKEW_RETRIES}`);
    await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
  }
}
