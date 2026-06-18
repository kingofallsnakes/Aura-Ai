import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const createSupabaseClient = (accessToken: string) => {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};
