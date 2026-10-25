import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

const origins = new Set(
  (Deno.env.get("APP_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();

  if (!reader) {
    throw new Error("INVALID_REQUEST");
  }

  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();

      if (done) break;

      size += value.byteLength;

      if (size > 1024) {
        await reader.cancel();
        throw new Error("INVALID_REQUEST");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(bytes));
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");

  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
  });

  if (origin && origins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set(
      "Access-Control-Allow-Headers",
      "authorization, apikey, content-type, x-client-info",
    );
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Expose-Headers", "Retry-After");
  }

  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers,
    });

  if (origin && !origins.has(origin)) {
    return reply({ code: "UNAUTHORIZED" }, 403);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  if (request.method !== "POST") {
    return reply({ code: "INVALID_REQUEST" }, 405);
  }

  try {
    const authorization = request.headers.get("Authorization");
    const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

    if (!token) {
      return reply({ code: "AUTH_REQUIRED" }, 401);
    }

    const { data: auth, error: authError } = await admin.auth.getUser(token);

    if (authError || !auth.user) {
      return reply({ code: "AUTH_REQUIRED" }, 401);
    }

    let body: unknown;

    try {
      body = await readBody(request);
    } catch {
      return reply({ code: "INVALID_REQUEST" }, 400);
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("username" in body) ||
      typeof body.username !== "string"
    ) {
      return reply({ code: "INVALID_REQUEST" }, 400);
    }

    const username = body.username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return reply({ code: "INVALID_REQUEST" }, 400);
    }

    const signal = AbortSignal.timeout(10_000);

    const { data: budgets, error: budgetError } = await admin
      .rpc("consume_request_budget", {
        p_bucket_key: `username-availability:${auth.user.id}`,
        p_limit: 60,
        p_window_seconds: 60,
      })
      .abortSignal(signal);

    const budget = budgets?.[0];

    if (budgetError || !budget || typeof budget.allowed !== "boolean") {
      return reply({ code: "REQUEST_FAILED" }, 503);
    }

    if (!budget.allowed) {
      headers.set("Retry-After", String(budget.retry_after_seconds ?? 60));

      return reply({ code: "RATE_LIMITED" }, 429);
    }

    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", auth.user.id)
      .limit(1)
      .abortSignal(signal);

    if (error) {
      return reply({ code: "REQUEST_FAILED" }, 503);
    }

    return reply({
      available: data.length === 0,
    });
  } catch {
    return reply({ code: "REQUEST_FAILED" }, 503);
  }
});
