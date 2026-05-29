export const SUPABASE_URL = "https://zoikadgbuwhexeyczrzs.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_W6M3lzw3Uk58LbHWyxE4vg_Ze9USyZT";

let _client = null;

export async function getSupabaseClient() {
  if (_client) return _client;

  const { createClient } = await import(
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
  );

  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}
