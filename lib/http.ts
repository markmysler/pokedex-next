import "server-only";
import { NextResponse } from "next/server";

// Request body as a plain object, or null if it's missing, malformed JSON,
// or not an object. Route Handlers check for null and answer 400 instead of
// letting request.json() throw into an unhandled 500.
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body !== null && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// For ids that end up inside a PostgREST filter string (.or(...)), where a
// value isn't escaped the way .eq() parameters are.
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function badRequest(message = "Invalid request body") {
  return NextResponse.json({ error: message }, { status: 400 });
}

// Logs the real database/RPC error server-side and returns a generic 500,
// so Postgres messages (table, constraint and column names) never reach the
// client.
export function serverError(context: string, error: unknown) {
  console.error(`${context} failed:`, error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
