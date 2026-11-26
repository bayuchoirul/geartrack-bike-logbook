// scripts/generate-config.mjs
import fs from 'node:fs';
import path from 'node:path';

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || '').trim();
const targetPath = path.resolve('public/js/core/supabase-config.js');

if (!supabaseUrl || !supabaseAnonKey) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(
      targetPath,
      `// Auto-generated fallback saat build lokal tanpa env\nexport const SUPABASE_CONFIG = Object.freeze({\n  supabaseUrl: '',\n  supabaseAnonKey: '',\n});\n`,
      'utf8'
    );
  }
  console.warn('[GearTrack] SUPABASE_URL / SUPABASE_ANON_KEY tidak ditemukan di env; menggunakan supabase-config.js yang ada.');
  process.exit(0);
}

const content = `// Auto-generated saat build dari Environment Variables\nexport const SUPABASE_CONFIG = Object.freeze({\n  supabaseUrl: ${JSON.stringify(supabaseUrl)},\n  supabaseAnonKey: ${JSON.stringify(supabaseAnonKey)},\n});\n`;

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, content, 'utf8');
console.log('[GearTrack] public/js/core/supabase-config.js berhasil dibuat.');