// Create Supabase client initialization
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://lfyyxdgedovaarxwnhfe.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmeXl4ZGdlZG92YWFyeHduaGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2ODAyMDksImV4cCI6MjA3MDI1NjIwOX0.ewJx_zdUWKrA6tAv_L0ntcfRTT4g4mej8RXIQp_wIpU';

// Service role key for administrative operations (only use for server-side operations)
export const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmeXl4ZGdlZG92YWFyeHduaGZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4MDIwOSwiZXhwIjoyMDcwMjU2MjA5fQ.G4rFMN-pE2fIdOGSG9iEO7Q8OGZY7O1Kh7DxEKK9AKY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for administrative operations that bypass RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
