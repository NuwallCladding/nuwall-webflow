import { defineConfig } from 'vite';
import { resolve } from 'path';

// Each key becomes a separate self-contained file in /dist as <name>.min.js.
// Add a new line here whenever you create a new page-specific entry.
const entries = {
  global: 'src/entries/global.js',
  'drawings-viewer': 'src/entries/drawings-viewer.js',
  'colour-picker': 'src/entries/colour-picker.js',
  'home-page': 'src/entries/home-page.js',
  'colour-page': 'src/entries/colour-page.js',
};

// IIFE output can't share code chunks between entries, so we build ONE entry
// per Vite run. The ENTRY env var selects which; the build script loops over
// all of them. Each output is a single standalone self-executing script —
// exactly what a Webflow <script src> wants.
const entryName = process.env.ENTRY;
if (!entryName || !entries[entryName]) {
  throw new Error(
    `Set ENTRY to one of: ${Object.keys(entries).join(', ')} (got "${entryName}")`
  );
}

export default defineConfig({
  build: {
    target: 'es2018',
    minify: 'esbuild',
    emptyOutDir: false, // build script clears dist once, up front
    lib: {
      entry: resolve(__dirname, entries[entryName]),
      formats: ['iife'],
      name: `wf_${entryName.replace(/-/g, '_')}`,
      fileName: () => `${entryName}.min.js`,
    },
    rollupOptions: {
      output: { dir: 'dist' },
    },
  },
});
