import type { Database } from "@/models/database";
import { env } from "@/shared/lib/env";
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient<Database>(
  env.supabaseUrl,
  env.supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  },
)