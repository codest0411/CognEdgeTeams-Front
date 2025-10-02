import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if we have valid Supabase config
const hasValidSupabase = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseAnonKey !== 'placeholder_anon_key'

export const supabase = hasValidSupabase 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isSupabaseConfigured = hasValidSupabase
