// Resource library viewer: fetches the resources API, renders one card per
// resource, and filters by installation type / resource type / search.
// Unlike the drawings viewer, resources are a flat list — everything is
// visible on load and paginated with "view more". Populating either dropdown
// filter switches into "show all matches + bulk zip" mode.
import { withButtonSpinner } from '../utils/button-spinner.js';
import { openWorkingSpecPreview } from './working-spec-links.js';

const API = {
  url: 'https://cms.nuwall.co.nz/api/resources',
  zipUrl: 'https://cms.nuwall.co.nz/api/resources/download-zip',
  key: 'nk_99b79c6d5168840d0b11a35e1953d2c1b5f38c6d0b6970cbaf0e69abfe8424ff',
};

const INSTALLATION_TYPE_OPTIONS = [
  { label: 'Vertical Over Cavity', value: 'vertical-over-cavity' },
  { label: 'Horizontal Over Cavity', value: 'horizontal-over-cavity' },
  { label: 'Direct Fix', value: 'direct-fix' },
];

const RESOURCE_TYPE_OPTIONS = [
  { label: 'Compliance', value: 'compliance' },
  { label: 'Specification', value: 'specification' },
  { label: 'Installation', value: 'installation' },
  { label: 'Care & Maintenance', value: 'care-maintenance' },
  { label: 'Colour & Finishes', value: 'colour-finishes' },
  { label: 'Brochures', value: 'brochures' },
  { label: 'Interactive Installation Videos', value: 'interactive-installation-videos' }
];

export function initResourceViewer() {
  // The grid is the item template's parent, not a fixed class — the item's
  // own inner wrapper is also named `.doc-content-wrapper`, so selecting by
  // that class would grab the wrong (nested) element.
  const template = document.querySelector('.doc-content-item');
  if (!template) {
    console.warn('[resources] template not found — resource viewer aborted');
    return;
  }
  const grid = template.parentElement;
  if (!grid) return;

  template.setAttribute('data-nw-template', 'true');
  template.style.display = 'none';

  // Optional: groups the unfiltered list into "Compliance", "Brochures", etc.
  // rows. Feature is skipped entirely if the template isn't present.
  const headerTemplate = grid.querySelector('.doc-content-header');
  if (headerTemplate) {
    headerTemplate.setAttribute('data-nw-template', 'true');
    headerTemplate.style.display = 'none';
  } else {
    console.warn('[resources] header template not found — category headers disabled');
  }

  const searchInput = document.querySelector('.cad-lib-search-input');
  const searchBtn = document.querySelector('[data-role="search-btn"]');
  const searchForm = searchInput ? searchInput.closest('form') : document.querySelector('.cad-lib-search-form');

  const state = {
    allResources: [],
    filters: { installationType: '', type: '', search: '' },
    matchedIds: [],
    selectedIds: new Set(),
    visibleCount: 30,
    itemsPerPage: 30,
    firstRender: true,
  };

  // ---- helpers -------------------------------------------------------

  function toKebab(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function resetPage() {
    state.visibleCount = state.itemsPerPage;
  }

  // Fades a card in/out instead of snapping display on/off. `display: none`
  // is applied only after the fade-out finishes (matching the CSS
  // transition duration in site.scss), so the layout still collapses once
  // the card is actually invisible.
  const FADE_MS = 200;

  function setCardVisibility(card, visible, instant) {
    if (instant) {
      card.style.display = visible ? '' : 'none';
      card.style.opacity = visible ? '1' : '0';
      return;
    }

    if (visible) {
      if (card.style.display === 'none') card.style.display = '';
      requestAnimationFrame(() => {
        card.style.opacity = '1';
      });
    } else {
      card.style.opacity = '0';
      window.setTimeout(() => {
        if (card.style.opacity === '0') card.style.display = 'none';
      }, FADE_MS);
    }
  }

  // Anchor tags can't send custom headers, so previews/downloads/zips are
  // fetched here with the API key and handed to the browser as a blob.
  const MIME_EXT = {
    'application/pdf': '.pdf',
    'application/zip': '.zip',
    'application/x-zip-compressed': '.zip',
  };

  function filenameFromResponse(res, baseName) {
    const cd = res.headers.get('content-disposition') || '';
    const match = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    if (match) return decodeURIComponent(match[1]);

    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    return baseName + (MIME_EXT[type] || '');
  }

  function downloadWithApiKey(url, baseName) {
    return fetch(url, { headers: { 'x-api-key': API.key } })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const filename = filenameFromResponse(res, baseName);
        return res.blob().then((blob) => ({ blob, filename }));
      })
      .then(({ blob, filename }) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
      });
  }

  // Opens a blank tab synchronously (so it isn't popup-blocked once the
  // fetch resolves later), then points it at the fetched blob.
  function previewWithApiKey(url) {
    const win = window.open('', '_blank');
    return fetch(url, { headers: { 'x-api-key': API.key } })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        if (win) win.location = blobUrl;
      })
      .catch((err) => {
        if (win) win.close();
        throw err;
      });
  }

  function downloadZipWithApiKey(ids) {
    return fetch(API.zipUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API.key },
      body: JSON.stringify({ ids }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const filename = filenameFromResponse(res, 'nuwall-resources');
        return res.blob().then((blob) => ({ blob, filename }));
      })
      .then(({ blob, filename }) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
      });
  }

  // Close a Webflow dropdown without leaving its internal open-state stale
  // (replay an outside pointer event so Webflow closes it itself; manual
  // class removal is a guaranteed visual fallback).
  function closeDropdown(link) {
    const dropdown = link.closest('.w-dropdown');
    if (!dropdown) return;

    ['mousedown', 'mouseup', 'click'].forEach((type) => {
      document.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
    });

    const toggle = dropdown.querySelector('.w-dropdown-toggle');
    const list = dropdown.querySelector('.w-dropdown-list');
    dropdown.classList.remove('w--open');
    if (toggle) {
      toggle.classList.remove('w--open');
      toggle.setAttribute('aria-expanded', 'false');
    }
    if (list) list.classList.remove('w--open');
  }

  function updateDropdownLabel(link, text) {
    const dropdown = link.closest('.w-dropdown');
    if (!dropdown) return;
    const label = dropdown.querySelector('.filter-placeholder');
    if (label) {
      label.textContent = text;
      label.classList.add('is-selected');
    }
  }

  function labelFor(options, value) {
    const opt = options.filter((o) => o.value === value)[0];
    return opt ? opt.label : '';
  }

  // Builds "Vertical Over Cavity - Compliance - Search "windows"" from
  // whichever of the 3 filters are active, in that fixed order.
  function updateFilterHeader() {
    const el = document.querySelector('.filter-header');
    if (!el) return;

    const f = state.filters;
    const parts = [];
    if (f.installationType) parts.push(labelFor(INSTALLATION_TYPE_OPTIONS, f.installationType));
    if (f.type) parts.push(labelFor(RESOURCE_TYPE_OPTIONS, f.type));
    if (f.search) parts.push('Search "' + f.search + '"');

    el.textContent = parts.join(' - ');
    el.style.display = parts.length ? '' : 'none';
  }

  // ---- card rendering --------------------------------------------------

  function makeCard(doc) {
    const card = template.cloneNode(true);
    card.removeAttribute('data-nw-template');
    card.style.display = '';

    const nameEl = card.querySelector('.doc-file-name');
    if (nameEl) nameEl.textContent = doc.title || '';

    const previewLink = card.querySelector('.rl-preview-asset');
    if (previewLink) {
      if (doc.modelCode) {
        // Interactive installation videos open the WorkingSpec 3D model
        // overlay instead of the usual blob preview — no fetch involved.
        previewLink.href = '#';
        previewLink.onclick = (e) => {
          e.preventDefault();
          openWorkingSpecPreview(doc.modelCode, doc.title);
        };
      } else if (doc.viewUrl) {
        previewLink.href = '#';
        previewLink.onclick = (e) => {
          e.preventDefault();
          withButtonSpinner(previewLink, () => previewWithApiKey(doc.viewUrl)).catch((err) => {
            console.error('[resources] preview failed:', doc.title, err);
          });
        };
      } else {
        previewLink.style.display = 'none';
      }
    }

    const downloadLink = card.querySelector('.rl-download-assets');
    if (downloadLink) {
      if (doc.downloadUrl) {
        downloadLink.href = '#';
        downloadLink.onclick = (e) => {
          e.preventDefault();
          withButtonSpinner(downloadLink, () =>
            downloadWithApiKey(doc.downloadUrl, toKebab(doc.title || 'resource'))
          ).catch((err) => {
            console.error('[resources] download failed:', doc.title, err);
          });
        };
      } else {
        downloadLink.style.display = 'none';
      }
    }

    const checkbox = card.querySelector('.checkbox-item');
    if (checkbox) {
      checkbox.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSelection(doc.id, checkbox);
      });
    }

    card.setAttribute('data-id', doc.id);
    card.setAttribute('data-installationtypes', (doc.installationTypes || []).join(' '));
    card.setAttribute('data-resourcetype', (doc.resourceType || []).join(' '));
    card.setAttribute('data-category', primaryCategory(doc));
    card.setAttribute('data-name', (doc.title || '').toLowerCase());
    if (doc.modelCode) card.setAttribute('data-modelcode', doc.modelCode);

    return card;
  }

  // A resource can carry multiple resourceType tags; the first one decides
  // which "Compliance" / "Brochures" group it's sorted and headered under.
  function primaryCategory(doc) {
    return (doc.resourceType && doc.resourceType[0]) || '';
  }

  function sortByResourceType(list) {
    const order = RESOURCE_TYPE_OPTIONS.map((o) => o.value);
    return list.slice().sort((a, b) => {
      const aIdx = order.indexOf(primaryCategory(a));
      const bIdx = order.indexOf(primaryCategory(b));
      return (aIdx === -1 ? order.length : aIdx) - (bIdx === -1 ? order.length : bIdx);
    });
  }

  function makeHeader(category) {
    const header = headerTemplate.cloneNode(true);
    header.removeAttribute('data-nw-template');
    header.style.display = '';
    header.setAttribute('data-category', category);

    const labelEl = header.querySelector('.category-header');
    if (labelEl) labelEl.textContent = labelFor(RESOURCE_TYPE_OPTIONS, category) || category;

    return header;
  }

  // ---- bulk selection --------------------------------------------------

  function toggleSelection(id, checkboxEl) {
    const key = String(id);
    if (state.selectedIds.has(key)) {
      state.selectedIds.delete(key);
      checkboxEl.classList.remove('w--redirected-checked');
    } else {
      state.selectedIds.add(key);
      checkboxEl.classList.add('w--redirected-checked');
    }
    updateSelectionBar();
  }

  function updateSelectionBar() {
    const bar = document.querySelector('.selection-bulk-download-bar');
    const btn = document.querySelector('.selection-bulk-download-btn');
    const count = state.selectedIds.size;

    if (bar) bar.style.display = count ? '' : 'none';
    if (btn) btn.textContent = 'Download (' + count + ') Selected';
  }

  function wireSelectionDownload() {
    const btn = document.querySelector('.selection-bulk-download-btn');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!state.selectedIds.size) return;
      withButtonSpinner(btn, () => downloadZipWithApiKey(Array.from(state.selectedIds))).catch((err) => {
        console.error('[resources] selection zip download failed:', err);
      });
    });
  }

  function renderCards() {
    grid.querySelectorAll('.doc-content-item:not([data-nw-template])').forEach((el) => el.remove());
    grid.querySelectorAll('.doc-content-header:not([data-nw-template])').forEach((el) => el.remove());

    let lastCategory = null;
    sortByResourceType(state.allResources).forEach((doc) => {
      try {
        const category = primaryCategory(doc);
        if (headerTemplate && category !== lastCategory) {
          grid.appendChild(makeHeader(category));
          lastCategory = category;
        }
        const card = makeCard(doc);
        if (card) grid.appendChild(card);
      } catch (e) {
        console.error('[resources] makeCard failed:', doc.title, e.message);
      }
    });

    applyFilters();
  }

  // ---- filtering ---------------------------------------------------------

  function applyFilters() {
    const f = state.filters;
    const allCards = grid.querySelectorAll('.doc-content-item:not([data-nw-template])');
    const matched = [];

    allCards.forEach((card) => {
      const matchInstallation =
        !f.installationType || card.getAttribute('data-installationtypes').split(' ').indexOf(f.installationType) !== -1;
      const matchType = !f.type || card.getAttribute('data-resourcetype').split(' ').indexOf(f.type) !== -1;
      const matchSearch = !f.search || card.getAttribute('data-name').indexOf(f.search.toLowerCase()) !== -1;

      if (matchInstallation && matchType && matchSearch) matched.push(card);
    });

    // Any of the 3 filters (installation type, type, search) active means
    // "show all matches" instead of the normal paginated view.
    const filterActive = !!(f.installationType || f.type || f.search);
    const dropdownFilterActive = !!(f.installationType || f.type);

    const visible = new Set();
    matched.forEach((card, i) => {
      if (filterActive || i < state.visibleCount) visible.add(card);
    });
    allCards.forEach((card) => setCardVisibility(card, visible.has(card), state.firstRender));

    // Category header rows: hidden entirely once a resourceType filter is
    // picked; otherwise a header shows only if its group has a visible card.
    const categoryFilterActive = !!f.type;
    const visibleCategories = new Set();
    if (!categoryFilterActive) {
      visible.forEach((card) => visibleCategories.add(card.getAttribute('data-category')));
    }
    grid.querySelectorAll('.doc-content-header:not([data-nw-template])').forEach((header) => {
      const show = !categoryFilterActive && visibleCategories.has(header.getAttribute('data-category'));
      setCardVisibility(header, show, state.firstRender);
    });

    state.firstRender = false;

    const viewMoreWrapper = document.querySelector('.resource-lib-view-more');
    if (viewMoreWrapper) {
      viewMoreWrapper.style.display = !filterActive && matched.length > state.visibleCount ? '' : 'none';
    }

    state.matchedIds = matched.map((card) => card.getAttribute('data-id'));

    const bulkWrapper = document.querySelector('.resource-lib-bulk-wrapper');
    if (bulkWrapper) bulkWrapper.style.display = dropdownFilterActive ? '' : 'none';

    if (dropdownFilterActive) {
      const counterEl = document.querySelector('.library-drawing-counter');
      if (counterEl) counterEl.textContent = matched.length + ' Resources';
    }

    updateFilterHeader();
  }

  // ---- filter wiring -------------------------------------------------

  function safe(name, fn) {
    try {
      fn();
    } catch (e) {
      console.error('[resources] failed to wire "' + name + '":', e);
    }
  }

  function wireFilterDropdown(fieldName, options, applyValue) {
    const dropdown = document.querySelector('.resource-filter-drowpdown[data-res-filter="' + fieldName + '"]');
    if (!dropdown) return;
    const nav = dropdown.querySelector('nav');
    if (!nav) return;

    nav.innerHTML = '';

    const allLink = document.createElement('a');
    allLink.setAttribute('href', '#');
    allLink.className = 'resources-search-fitler-item w-dropdown-link';
    allLink.textContent = 'All';
    nav.appendChild(allLink);
    allLink.addEventListener('click', (e) => {
      e.preventDefault();
      resetPage();
      applyValue('');
      updateDropdownLabel(allLink, 'All');
      applyFilters();
      closeDropdown(allLink);
    });

    options.forEach((opt) => {
      const link = document.createElement('a');
      link.setAttribute('href', '#');
      link.className = 'resources-search-fitler-item w-dropdown-link';
      link.textContent = opt.label;
      nav.appendChild(link);
      link.addEventListener('click', (e) => {
        e.preventDefault();
        resetPage();
        applyValue(opt.value);
        updateDropdownLabel(link, opt.label);
        applyFilters();
        closeDropdown(link);
      });
    });
  }

  const SEARCH_MIN_CHARS = 1;

  function runSearch(value) {
    const q = (value || '').trim();
    // Only treat as an active search at 1+ chars; otherwise clear it.
    state.filters.search = q.length >= SEARCH_MIN_CHARS ? q : '';
    resetPage();
    applyFilters();
  }

  function wireSearch() {
    let debounceTimer;

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const value = searchInput.value;
        debounceTimer = setTimeout(() => runSearch(value), 200);
      });

      // Enter still forces an immediate search (bypasses debounce).
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(debounceTimer);
          runSearch(searchInput.value);
        }
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearTimeout(debounceTimer);
        runSearch(searchInput ? searchInput.value : '');
      });
    }
  }

  // Lets a link like "?searchTerm=epd" preload the search box once the
  // resources have loaded, so a shared URL can jump straight to a filtered
  // view without the user retyping the search.
  function preloadSearchFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const term = [...params].find(([k]) => k.toLowerCase() === "searchterm")?.[1] ?? null;
    if (!term) return;
    if (searchInput) searchInput.value = term;
    runSearch(term);
  }

  function wireViewMore() {
    const btn = document.querySelector('.button-view-more');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      state.visibleCount += state.itemsPerPage;
      applyFilters();
    });
  }

  function wireZipDownload() {
    const btn = document.querySelector('.tag-file-type');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!state.matchedIds.length) return;
      withButtonSpinner(btn, () => downloadZipWithApiKey(state.matchedIds)).catch((err) => {
        console.error('[resources] zip download failed:', err);
      });
    });
  }

  // ---- init ------------------------------------------------------------

  // Hidden until a checkbox is ticked, before the fetch even resolves, so
  // it never flashes visible on load.
  const selectionBar = document.querySelector('.selection-bulk-download-bar');
  if (selectionBar) selectionBar.style.display = 'none';

  // Markup ships with this hidden (avoids a flash of empty state before JS
  // runs) — reveal it as soon as the viewer takes over, not after the fetch.
  const wrapper = document.querySelector('.resources-wrapper');
  if (wrapper) wrapper.style.display = '';

  fetch(API.url+"?limit=0&sort=resourceType", { headers: { 'Content-Type': 'application/json', 'x-api-key': API.key } })
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then((data) => {
      state.allResources = data.docs || [];

      renderCards();

      safe('installationtypes', () =>
        wireFilterDropdown('installationtypes', INSTALLATION_TYPE_OPTIONS, (v) => {
          state.filters.installationType = v;
        })
      );
      safe('type', () =>
        wireFilterDropdown('type', RESOURCE_TYPE_OPTIONS, (v) => {
          state.filters.type = v;
        })
      );
      safe('search', wireSearch);
      safe('view-more', wireViewMore);
      safe('zip-download', wireZipDownload);
      safe('selection-download', wireSelectionDownload);
      safe('preload-search', preloadSearchFromQuery);
    })
    .catch((err) => {
      console.error('[resources] fetch failed:', err);
    });
}
