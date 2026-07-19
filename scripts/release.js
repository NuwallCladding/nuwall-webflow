// Prints the jsDelivr URLs for the current package version so you can paste
// them straight into Webflow. Run via `npm run release` after a build.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
// Change this to your actual GitHub "user/repo".
const REPO = 'yourname/webflow-scripts';
const version = `v${pkg.version}`;

const files = readdirSync(resolve(root, 'dist')).filter((f) => f.endsWith('.js'));

console.log(`\njsDelivr URLs for ${version}:\n`);
for (const file of files) {
  console.log(
    `  https://cdn.jsdelivr.net/gh/${REPO}@${version}/dist/${file}`
  );
}
console.log(
  `\nRemember: git tag ${version} && git push --tags before these resolve.\n`
);
