import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if keys exist (to debug if they are missing)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase keys are missing in .env.local!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);