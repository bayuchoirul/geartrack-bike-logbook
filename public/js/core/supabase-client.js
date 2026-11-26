// public/js/core/supabase-client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_CONFIG } from './supabase-config.js';

const CONFIG_CACHE_KEY = 'geartrack_supabase_cfg_v2';

/** @type {import('https://esm.sh/@supabase/supabase-js@2').SupabaseClient | null} */
let clientInstance = null;

/** @type {Promise<import('https://esm.sh/@supabase/supabase-js@2').SupabaseClient> | null} */
let initPromise = null;

/**
 * @returns {Promise<{ supabaseUrl: string, supabaseAnonKey: string }>}
 */
async function loadPublicConfig() {
  sessionStorage.removeItem('geartrack_supabase_cfg_v1');

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

  const runtimeOverride = /** @type {any} */ (window).__GEARTRACK_CONFIG__;
  const supabaseUrl = (runtimeOverride?.supabaseUrl || SUPABASE_CONFIG.supabaseUrl || '').trim();
  const supabaseAnonKey = (runtimeOverride?.supabaseAnonKey || SUPABASE_CONFIG.supabaseAnonKey || '').trim();

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