import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton — réutilisé sur toute la session navigateur
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
