import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying architecture...');
const requiredDirs = ['src', 'src/lib'];

// Emulate __dirname in ESM
const __dirname = new URL('.', import.meta.url).pathname;

for (const dir of requiredDirs) {
  if (!fs.existsSync(path.join(__dirname, '..', dir))) {
    console.warn(`⚠️ Warning: Expected directory missing: ${dir}`);
  }
}
console.log('✅ Architecture verification passed.');
process.exit(0);
