import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && key);

export function createSupabaseBrowserClient() {
  if (!url || !key) throw new Error("Supabase is not configured. Add the public URL and publishable key.");
  return createBrowserClient(url, key);
}
