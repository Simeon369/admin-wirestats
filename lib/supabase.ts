// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase env vars are not configured.');
    _client = createClient(url, key);
  }
  return _client;
}

// Named export for convenience — only safe to use in browser/effect context
export const supabase = (() => {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) {
    // Return a dummy client during SSR prerender — real calls happen client-side
    return null as unknown as SupabaseClient;
  }
  return createClient(url, key);
})();
