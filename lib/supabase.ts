import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client for browser usage (with anon key)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (with service role key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || '');

// Types for our database tables
export type LogStats = {
  id: string;
  job_id: string;
  file_id: string;
  file_name: string;
  file_size: number;
  total_lines: number;
  error_count: number;
  warning_count: number;
  keyword_matches: Record<string, number>;
  ip_addresses: Record<string, number>;
  created_at: string;
  updated_at: string;
  user_id: string;
  status: 'processing' | 'completed' | 'failed';
  processing_time: number;
};

export type LogEntry = {
  timestamp: string;
  level: string;
  message: string;
  payload?: Record<string, any>;
  ip?: string;
};