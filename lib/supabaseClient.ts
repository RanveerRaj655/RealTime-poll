import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Check your .env.local file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Poll = {
  id: string;
  question: string;
  created_at: string;
};

export type PollOption = {
  id: string;
  poll_id: string;
  text: string;
  votes_count: number;
};

export type Vote = {
  id: string;
  poll_id: string;
  option_id: string;
  ip_hash: string;
  created_at: string;
};