# webflow-scripts

Custom JavaScript for the Nu-Wall Webflow site. Edited in VS Code, built with Vite, served via jsDelivr from GitHub tags.

## Setup

```bash
npm install
```

## Develop

```bash
npm run dev      # vite build --watch, rebuilds dist/ on save
```

## Build

```bash
npm run build    # one-off minified build into dist/
npm run release  # build + print the jsDelivr URLs for the current version
```

## Adding a new page script

1. Create `src/entries/my-feature.js`.
2. Add it to the `entries` object in `vite.config.js`.
3. Build. You get `dist/my-feature.min.js`.
4. Include it on the relevant Webflow page (see below).

## Structure

- `src/core/` — reusable modules (mega menu, mobile menu, nav scroll).
- `src/entries/` — one file per output bundle. `global.js` is site-wide; the rest are page-specific.
- `src/utils/` — shared helpers.
- `dist/` — build output. **Committed on purpose** (jsDelivr serves it).

## Cutting a release

1. Bump `version` in `package.json`.
2. Commit and push to `main`.
3. Tag and push:
   ```bash
   git tag v1.0.1
   git push --tags
   ```
4. Update the version number in your Webflow embeds.

Pin to the tag, never `@latest` or a branch — jsDelivr caches those and you'll serve stale code.

## Webflow inclusion

**Global JavaScript** (Site Settings → Custom Code → Footer):

```html
<script src="https://cdn.jsdelivr.net/gh/yourname/webflow-scripts@v1.0.0/dist/global.min.js"></script>
```

**Global CSS** (Site Settings → Custom Code → Head):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/yourname/webflow-scripts@v1.0.0/dist/site.min.css" />
```

**Page-specific** (Page Settings → Custom Code):

```html
<script src="https://cdn.jsdelivr.net/gh/yourname/webflow-scripts@v1.0.0/dist/colour-picker.min.js"></script>
```

Replace `yourname/webflow-scripts` with your actual repo path in both the embeds and `scripts/release.js`.

## Purging cache (only if you reuse a tag — don't)

```
https://purge.jsdelivr.net/gh/yourname/webflow-scripts@v1.0.0/dist/global.min.js
```
