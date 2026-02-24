// Create Supabase client initialization
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://ysxwpedykxzjflehogga.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeHdwZWR5a3h6amZsZWhvZ2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Mjg1MTIsImV4cCI6MjA4NzUwNDUxMn0.G0FwNtRe9QXfmFVKLbcY5Y1gdF2chnAJqgLV2MOiTTw';

// Service role key for administrative operations (only use for server-side operations)
export const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzeHdwZWR5a3h6amZsZWhvZ2dhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkyODUxMiwiZXhwIjoyMDg3NTA0NTEyfQ.ph2I8MhHmfRYayUzugh2-_S8qJje_f5shSEaoCKKu3E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for administrative operations that bypass RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
