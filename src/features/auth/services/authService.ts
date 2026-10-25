import {
  AuthError,
  FunctionsHttpError,
  type User,
} from "@supabase/supabase-js";
import { z } from "zod";

import type {
  AuthCredentials,
  AuthFeedback,
  AuthObserver,
  AuthUser,
} from "@/models/auth";

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

export async function signIn(credentials: AuthCredentials): Promise<void> {
  const identifier = credentials.email.trim();

  if (identifier.includes("@") && !identifier.startsWith("@")) {
    const { error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password: credentials.password,
    });

    if (error) throw error;
    return;
  }

  const { data, error } = await supabase.functions.invoke<unknown>(
    "usernameLogin",
    {
      body: {
        username: identifier.replace(/^@/, "").toLowerCase(),
        password: credentials.password,
      },
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const status = error.context.status;

      if (status === 401 || status === 400) {
        throw new AuthError("Invalid credentials", 400, "invalid_credentials");
      }

      if (status === 429) {
        throw new AuthError(
          "Too many requests",
          429,
          "over_request_rate_limit",
        );
      }
    }

    throw error;
  }

  const session = sessionSchema.parse(data);

  const { error: sessionError } = await supabase.auth.setSession(session);

  if (sessionError) throw sessionError;
}

export async function signUp(credentials: AuthCredentials): Promise<void> {
  const { data, error } = await supabase.auth.signUp(credentials);

  if (error) throw error;

  if (!data.session) {
    throw new AuthError(
      "Sign-up did not return an active session.",
      400,
      "signup_session_missing",
    );
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut({
    scope: "local",
  });

  if (error) throw error;
}
