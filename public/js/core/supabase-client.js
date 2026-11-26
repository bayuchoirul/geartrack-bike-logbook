// public/js/core/supabase-client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CONFIG_CACHE_KEY = 'geartrack_supabase_cfg_v1';

/** @type {import('https://esm.sh/@supabase/supabase-js@2').SupabaseClient | null} */
let clientInstance = null;

/** @type {Promise<import('https://esm.sh/@supabase/supabase-js@2').SupabaseClient> | null} */
let initPromise = null;

/**
 * @returns {Promise<{ supabaseUrl: string, supabaseAnonKey: string }>}
 */
async function loadPublicConfig() {
  const cached = sessionStorage.getItem(CONFIG_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed?.supabaseUrl && parsed?.supabaseAnonKey) {
        return parsed;
      }
    } catch {
      sessionStorage.removeItem(CONFIG_CACHE_KEY);
    }
  }

  const res = await fetch('/api/config');
  if (!res.ok) {
    throw new Error(`Gagal memuat konfigurasi Supabase (HTTP ${res.status}).`);
  }

  const data = await res.json();
  const supabaseUrl = data.supabaseUrl || data.SUPABASE_URL;
  const supabaseAnonKey = data.supabaseAnonKey || data.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL atau SUPABASE_ANON_KEY belum dikonfigurasi di Vercel.');
  }

  const config = { supabaseUrl, supabaseAnonKey };
  sessionStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
  return config;
}

/**
 * @returns {Promise<import('https://esm.sh/@supabase/supabase-js@2').SupabaseClient>}
 */
export async function getSupabaseClient() {
  if (clientInstance) return clientInstance;

  if (!initPromise) {
    initPromise = loadPublicConfig()
      .then(({ supabaseUrl, supabaseAnonKey }) => {
        clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
        return clientInstance;
      })
      .catch((err) => {
        initPromise = null;
        throw err;
      });
  }

  return initPromise;
}
