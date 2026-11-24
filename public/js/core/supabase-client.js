// frontend/js/core/supabase-client.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { loadAppConfig } from './config.js';

let supabaseInstance = null;
let loadedConfig = null;

export async function getSupabase() {
  if (supabaseInstance) return { supabase: supabaseInstance, config: loadedConfig };
  loadedConfig = await loadAppConfig();
  supabaseInstance = createClient(loadedConfig.URL, loadedConfig.ANON_KEY);
  return { supabase: supabaseInstance, config: loadedConfig };
}

export function formatIDR(amount) {
  const num = Number(amount) || 0;
  return 'Rp ' + num.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

export function formatKm(km) {
  const num = Number(km) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
