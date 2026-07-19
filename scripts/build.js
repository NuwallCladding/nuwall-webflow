// Builds every entry as its own IIFE bundle. IIFE can't code-split, so we run
// Vite once per entry (each sees ENTRY=<name>) and collect outputs into dist/.
import { rmSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Keep this list in sync with vite.config.js.
const entries = ['global', 'drawings-viewer', 'colour-picker', 'home-page'];

rmSync(resolve(root, 'dist'), { recursive: true, force: true });
mkdirSync(resolve(root, 'dist'), { recursive: true });

const viteBin = resolve(root, 'node_modules', 'vite', 'bin', 'vite.js');

for (const entry of entries) {
  console.log(`\n▶ building ${entry}`);
  execFileSync(process.execPath, [viteBin, 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ENTRY: entry },
  });
}

console.log('\n✓ all entries built into dist/');
