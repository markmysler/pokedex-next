import { describe, expect, it, vi } from "vitest";
import { fetchWithClockSkewRetry } from "@/lib/supabase/clockSkewFetch";

const skew = () => new Response(JSON.stringify({ code: "PGRST303", message: "JWT issued at future" }), { status: 401 });
const ok = () => new Response("[]", { status: 200 });

describe("fetchWithClockSkewRetry", () => {
  it("retries a 'JWT issued at future' 401 and returns the retry's answer", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const base = vi.fn().mockResolvedValueOnce(skew()).mockResolvedValueOnce(ok());
    const res = await fetchWithClockSkewRetry("https://x/rest/v1/t", undefined, base, 0);
    expect(res.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it("gives up after two retries", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const base = vi.fn().mockImplementation(async () => skew());
    const res = await fetchWithClockSkewRetry("https://x/rest/v1/t", undefined, base, 0);
    expect(res.status).toBe(401);
    expect(base).toHaveBeenCalledTimes(3);
  });

  it("doesn't retry other 401s or successes", async () => {
    const other = vi.fn().mockResolvedValue(new Response('{"message":"Invalid API key"}', { status: 401 }));
    expect((await fetchWithClockSkewRetry("u", undefined, other, 0)).status).toBe(401);
    expect(other).toHaveBeenCalledTimes(1);
    const fine = vi.fn().mockResolvedValue(ok());
    expect((await fetchWithClockSkewRetry("u", undefined, fine, 0)).status).toBe(200);
    expect(fine).toHaveBeenCalledTimes(1);
  });
});
