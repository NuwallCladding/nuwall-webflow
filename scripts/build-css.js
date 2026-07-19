import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const src = resolve(root, 'src', 'styles', 'site.scss');
const dist = resolve(root, 'dist');
const out = resolve(dist, 'site.min.css');

rmSync(out, { force: true });
mkdirSync(dist, { recursive: true });

const result = sass.compile(src, {
  style: 'compressed',
  sourceMap: false,
  loadPaths: [resolve(root, 'node_modules')],
});

writeFileSync(out, result.css, 'utf8');
console.log(`✓ wrote ${out}`);
