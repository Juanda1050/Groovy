import { createClient } from "@supabase/supabase-js";

const url = Deno.env.get("SUPABASE_URL")!;
const publicKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
};

const admin = createClient(url, serviceKey, options);

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

      if (size > 8192) {
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
    let body: unknown;

    try {
      body = await readBody(request);
    } catch {
      return reply({ code: "INVALID_REQUEST" }, 400);
    }

    if (
      typeof body !== "object" ||
      !body ||
      !("username" in body) ||
      typeof body.username !== "string" ||
      !("password" in body) ||
      typeof body.password !== "string"
    ) {
      return reply({ code: "INVALID_REQUEST" }, 400);
    }

    const username = body.username.trim().replace(/^@/, "").toLowerCase();

    if (
      !/^[a-z0-9_]{3,30}$/.test(username) ||
      !body.password ||
      body.password.length > 1024
    ) {
      return reply({ code: "INVALID_CREDENTIALS" }, 401);
    }

    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(username),
    );

    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    const budgets = [
      ["username-login:global", 180],
      [`username-login:${hash}`, 8],
    ] as const;

    for (const [bucket, limit] of budgets) {
      const { data, error } = await admin.rpc("consume_request_budget", {
        p_bucket_key: bucket,
        p_limit: limit,
        p_window_seconds: 60,
      });

      const budget = data?.[0];

      if (error || !budget || typeof budget.allowed !== "boolean") {
        return reply({ code: "REQUEST_FAILED" }, 503);
      }

      if (!budget.allowed) {
        headers.set(
          "Retry-After",
          String(Math.max(1, budget.retry_after_seconds ?? 60)),
        );

        return reply({ code: "RATE_LIMITED" }, 429);
      }
    }

    const { data: email, error: lookupError } = await admin.rpc(
      "get_username_login_email",
      {
        p_username: username,
      },
    );

    if (lookupError) {
      return reply({ code: "REQUEST_FAILED" }, 503);
    }

    const auth = createClient(url, publicKey, options);

    const { data, error } = await auth.auth.signInWithPassword({
      email:
        typeof email === "string" ? email : `missing-${hash}@invalid.example`,
      password: body.password,
    });

    if (error || !data.session || typeof email !== "string") {
      if (error?.status === 429) {
        return reply({ code: "RATE_LIMITED" }, 429);
      }

      if (error && (error.status === 0 || (error.status ?? 0) >= 500)) {
        return reply({ code: "REQUEST_FAILED" }, 503);
      }

      return reply({ code: "INVALID_CREDENTIALS" }, 401);
    }

    return reply({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch {
    return reply({ code: "REQUEST_FAILED" }, 503);
  }
});
