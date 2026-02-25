// Create Supabase client initialization
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * SECURITY WARNING: The service role key has administrative privileges and bypasses RLS.
 * It should NEVER be exposed to the client-side.
 *
 * In this Vite application, variables not prefixed with VITE_ are not included in the client bundle.
 * If you use import.meta.env.SUPABASE_SERVICE_ROLE_KEY, it will be undefined in the browser.
 *
 * Any operations requiring the service role key (like database cleanup) should be moved to
 * a secure server-side environment or Supabase Edge Functions.
 */
export const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for administrative operations that bypass RLS
// NOTE: This will be null in the browser as SUPABASE_SERVICE_ROLE_KEY is not prefixed with VITE_
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;
