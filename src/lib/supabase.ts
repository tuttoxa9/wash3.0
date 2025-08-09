// Create Supabase client initialization
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://lfyyxdgedovaarxwnhfe.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmeXl4ZGdlZG92YWFyeHduaGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2ODAyMDksImV4cCI6MjA3MDI1NjIwOX0.ewJx_zdUWKrA6tAv_L0ntcfRTT4g4mej8RXIQp_wIpU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
