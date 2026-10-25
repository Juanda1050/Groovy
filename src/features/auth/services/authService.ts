import {
  AuthError,
  FunctionsFetchError,
  FunctionsHttpError,
  type User,
} from "@supabase/supabase-js";
import { z } from "zod";

import type {
  AuthCredentials,
  AuthFeedback,
  AuthMode,
  AuthObserver,
  AuthUser,
} from "@/models/auth";

import { env } from "@/shared/lib/env";
import { supabase } from "@/shared/lib/supabaseClient";

function mapUser(user: User | null): AuthUser | null {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? null,
  };
}

export function getAuthFeedback(error: unknown): AuthFeedback {
  if (error instanceof TypeError) return "network";
  if (!(error instanceof AuthError)) return "requestFailed";

  if (error.status === 429) return "rateLimited";
  if (error.status === 0) return "network";

  switch (error.code) {
    case "invalid_credentials":
      return "invalidCredentials";

    case "email_not_confirmed":
      return "emailNotConfirmed";

    case "weak_password":
      return "weakPassword";

    case "signup_session_missing":
      return "registrationUnavailable";

    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rateLimited";

    default:
      return "requestFailed";
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      await signOut();
      return null;
    }

    throw error;
  }

  if (!data.session) return null;

  const { data: active, error: activityError } = await supabase.rpc(
    "touch_groovy_session",
  );

  if (activityError) throw activityError;

  if (active !== true) {
    await signOut();
    return null;
  }

  return mapUser(data.session.user);
}

export function observeAuth(observer: AuthObserver): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
      return;
    }

    observer(mapUser(session?.user ?? null));
  });

  return () => data.subscription.unsubscribe();
}

const sessionSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

const failureSchema = z.object({
  code: z.string(),
});

function toBase64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

async function encryptCredentials(
  mode: AuthMode,
  credentials: AuthCredentials,
) {
  if (!env.authPublicKey || !globalThis.crypto?.subtle) {
    throw new Error("AUTH_ENCRYPTION_UNAVAILABLE");
  }

  const publicKey = await crypto.subtle.importKey(
    "spki",
    Uint8Array.from(atob(env.authPublicKey), (character) =>
      character.charCodeAt(0),
    ),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"],
  );

  const key = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const rawKey = await crypto.subtle.exportKey("raw", key);

  const payload = new TextEncoder().encode(
    JSON.stringify({
      mode,
      identifier: credentials.email.trim(),
      password: credentials.password,
      issuedAt: Date.now(),
      nonce: crypto.randomUUID(),
    }),
  );

  try {
    const [encryptedKey, ciphertext] = await Promise.all([
      crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawKey),
      crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: new TextEncoder().encode("groovy-auth:v1"),
          tagLength: 128,
        },
        key,
        payload,
      ),
    ]);

    return {
      version: 1,
      encryptedKey: toBase64(new Uint8Array(encryptedKey)),
      iv: toBase64(iv),
      ciphertext: toBase64(new Uint8Array(ciphertext)),
    };
  } finally {
    new Uint8Array(rawKey).fill(0);
    payload.fill(0);
  }
}

async function authenticate(
  mode: AuthMode,
  credentials: AuthCredentials,
): Promise<void> {
  const body = await encryptCredentials(mode, credentials);

  const { data, error } = await supabase.functions.invoke<unknown>(
    "usernameLogin",
    {
      body,
      signal: AbortSignal.timeout(20_000),
    },
  );

  if (error) {
    if (error instanceof FunctionsFetchError) {
      throw new AuthError("Connection failed", 0);
    }

    if (error instanceof FunctionsHttpError) {
      const parsed = failureSchema.safeParse(
        await error.context
          .clone()
          .json()
          .catch(() => null),
      );

      const code = parsed.success ? parsed.data.code : "REQUEST_FAILED";

      const codes: Record<string, string> = {
        INVALID_CREDENTIALS: "invalid_credentials",
        EMAIL_NOT_CONFIRMED: "email_not_confirmed",
        WEAK_PASSWORD: "weak_password",
        REGISTRATION_UNAVAILABLE: "signup_session_missing",
        RATE_LIMITED: "over_request_rate_limit",
      };

      throw new AuthError(
        "Authentication failed",
        error.context.status,
        codes[code] ?? "request_failed",
      );
    }

    throw error;
  }

  const session = sessionSchema.parse(data);

  const { error: sessionError } = await supabase.auth.setSession(session);

  if (sessionError) throw sessionError;
}

export async function signIn(credentials: AuthCredentials): Promise<void> {
  await authenticate("signIn", credentials);
}

export async function signUp(credentials: AuthCredentials): Promise<void> {
  await authenticate("signUp", credentials);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut({
    scope: "local",
  });

  if (error) throw error;
}
