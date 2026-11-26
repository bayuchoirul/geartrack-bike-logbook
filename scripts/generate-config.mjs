// scripts/generate-config.mjs
import fs from 'node:fs';
import path from 'node:path';

const supabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  ''
).trim();

const supabaseAnonKey = (
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

const targetPath = path.resolve('public/js/core/supabase-config.js');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[GearTrack] Env var Supabase kosong saat build.',
    'SUPABASE_URL:', Boolean(supabaseUrl),
    'SUPABASE_ANON_KEY:', Boolean(supabaseAnonKey)
  );
  process.exit(0);
}

const content = `// public/js/core/supabase-config.js (auto-generated saat build)
export const SUPABASE_CONFIG = Object.freeze({
  supabaseUrl: ${JSON.stringify(supabaseUrl)},
  supabaseAnonKey: ${JSON.stringify(supabaseAnonKey)},
});
`;

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, content, 'utf8');
console.log('[GearTrack] public/js/core/supabase-config.js berhasil dibuat.');