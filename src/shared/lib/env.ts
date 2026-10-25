import { z } from "zod";

const environmentSchema = z.object({
  supabaseUrl: z.url(),
  supabasePublishableKey: z.string().min(1),
});

const result = environmentSchema.safeParse({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
});

if (!result.success) {
  throw new Error("Missing or invalid Supabase environment configuration.");
}

export const env = result.data;
