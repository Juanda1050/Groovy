import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type {
  AuthCredentials,
  AuthObserver,
  AuthUser,
  EmailVerification,
} from "@/models/auth";

function mapUser(user: User | null): AuthUser | null {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? null,
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  return mapUser(data.session?.user ?? null);
}

export function observeAuth(observer: AuthObserver): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    observer(mapUser(session?.user ?? null));
  });

  return () => data.subscription.unsubscribe();
}

export async function signIn(credentials: AuthCredentials): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) throw error;
}

export async function signUp(credentials: AuthCredentials): Promise<void> {
  const { error } = await supabase.auth.signUp(credentials);

  if (error) throw error;
}

export async function verifyEmail({
  email,
  token,
}: EmailVerification): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut({
    scope: "local",
  });

  if (error) throw error;
}
