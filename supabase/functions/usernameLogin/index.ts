import { createClient } from "@supabase/supabase-js";

import { decryptCredentials } from "./credentialEncryption.ts";

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

      if (size > 16384) {
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

  async function consume(
    bucket: string,
    limit: number,
    seconds = 60,
  ): Promise<boolean> {
    const { data, error } = await admin
      .rpc("consume_request_budget", {
        p_bucket_key: bucket,
        p_limit: limit,
        p_window_seconds: seconds,
      })
      .abortSignal(AbortSignal.timeout(10_000));

    const budget = data?.[0];

    if (error || !budget || typeof budget.allowed !== "boolean") {
      throw new Error("REQUEST_FAILED");
    }

    if (!budget.allowed) {
      headers.set(
        "Retry-After",
        String(Math.max(1, budget.retry_after_seconds ?? seconds)),
      );
    }

    return budget.allowed;
  }

  try {
    let body: unknown;

    try {
      body = await readBody(request);
    } catch {
      return reply({ code: "INVALID_REQUEST" }, 400);
    }

    if (!(await consume("encrypted-auth:global", 180))) {
      return reply({ code: "RATE_LIMITED" }, 429);
    }

    let credentials: Awaited<ReturnType<typeof decryptCredentials>>;

    try {
      credentials = await decryptCredentials(body);
    } catch {
      return reply({ code: "INVALID_REQUEST" }, 400);
    }

    const { mode, identifier, password, nonce } = credentials;

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const username = identifier.replace(/^@/, "").toLowerCase();

    if (
      (!isEmail && !/^[a-z0-9_]{3,30}$/.test(username)) ||
      (mode === "signUp" && !isEmail)
    ) {
      return reply({ code: "INVALID_REQUEST" }, 400);
    }

    if (!(await consume(`encrypted-auth:nonce:${nonce}`, 1, 300))) {
      return reply({ code: "INVALID_REQUEST" }, 400);
    }

    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(isEmail ? identifier.toLowerCase() : username),
    );

    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    if (!(await consume(`encrypted-auth:${mode}:${hash}`, 8))) {
      return reply({ code: "RATE_LIMITED" }, 429);
    }

    let email = identifier;
    let knownUser = true;

    if (!isEmail) {
      const { data, error } = await admin
        .rpc("get_username_login_email", {
          p_username: username,
        })
        .abortSignal(AbortSignal.timeout(10_000));

      if (error) {
        return reply({ code: "REQUEST_FAILED" }, 503);
      }

      knownUser = typeof data === "string";
      email = knownUser ? String(data) : `missing-${hash}@invalid.example`;
    }

    const auth = createClient(url, publicKey, options);

    const result =
      mode === "signUp"
        ? await auth.auth.signUp({ email, password })
        : await auth.auth.signInWithPassword({ email, password });

    const { data, error } = result;

    if (error) {
      if (error.status === 429) {
        return reply({ code: "RATE_LIMITED" }, 429);
      }

      if (error.status === 0 || (error.status ?? 0) >= 500) {
        return reply({ code: "REQUEST_FAILED" }, 503);
      }

      if (error.code === "email_not_confirmed") {
        return reply({ code: "EMAIL_NOT_CONFIRMED" }, 400);
      }

      if (error.code === "weak_password") {
        return reply({ code: "WEAK_PASSWORD" }, 400);
      }

      return reply(
        {
          code: mode === "signIn" ? "INVALID_CREDENTIALS" : "REQUEST_FAILED",
        },
        400,
      );
    }

    if (!knownUser) {
      return reply({ code: "INVALID_CREDENTIALS" }, 400);
    }

    if (!data.session) {
      return reply(
        {
          code:
            mode === "signUp"
              ? "REGISTRATION_UNAVAILABLE"
              : "INVALID_CREDENTIALS",
        },
        400,
      );
    }

    return reply({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch {
    return reply({ code: "REQUEST_FAILED" }, 503);
  }
});
