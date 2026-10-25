import { z } from "zod";

const environmentSchema = z.object({
  supabaseUrl: z.url(),
  supabasePublishableKey: z.string().min(1),
  authPublicKey: z.string().min(1).optional(),
});

const result = environmentSchema.safeParse({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  authPublicKey: import.meta.env.VITE_AUTH_PUBLIC_KEY,
});

if (!result.success) {
  throw new Error("Missing or invalid Supabase environment configuration.");
}

export const env = result.data;
