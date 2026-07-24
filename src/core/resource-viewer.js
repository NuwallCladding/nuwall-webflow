// Resource library viewer: fetches the resources API, renders one card per
// resource, and filters by installation type / resource type / search.
// Unlike the drawings viewer, resources are a flat list — everything is
// visible on load and paginated with "view more". Populating either dropdown
// filter switches into "show all matches + bulk zip" mode.
import { withButtonSpinner } from '../utils/button-spinner.js';

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
];

export function initResourceViewer() {
  const grid = document.querySelector('.doc-content-wrapper');
  if (!grid) return;

  const template = grid.querySelector('.doc-content-item');
  if (!template) {
    console.warn('[resources] template not found — resource viewer aborted');
    return;
  }
  template.setAttribute('data-nw-template', 'true');
  template.style.display = 'none';

  const searchInput = document.querySelector('.cad-lib-search-input');
  const searchBtn = document.querySelector('[data-role="search-btn"]');
  const searchForm = searchInput ? searchInput.closest('form') : document.querySelector('.cad-lib-search-form');

  const state = {
    allResources: [],
    filters: { installationType: '', type: '', search: '' },
    matchedIds: [],
    selectedIds: new Set(),
    visibleCount: 16,
    itemsPerPage: 16,
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
      if (doc.viewUrl) {
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
    card.setAttribute('data-name', (doc.title || '').toLowerCase());

    return card;
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

    state.allResources.forEach((doc) => {
      try {
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
    const matched = [];

    grid.querySelectorAll('.doc-content-item:not([data-nw-template])').forEach((card) => {
      const matchInstallation =
        !f.installationType || card.getAttribute('data-installationtypes').split(' ').indexOf(f.installationType) !== -1;
      const matchType = !f.type || card.getAttribute('data-resourcetype').split(' ').indexOf(f.type) !== -1;
      const matchSearch = !f.search || card.getAttribute('data-name').indexOf(f.search.toLowerCase()) !== -1;

      card.style.display = 'none';
      if (matchInstallation && matchType && matchSearch) matched.push(card);
    });

    // Any of the 3 filters (installation type, type, search) active means
    // "show all matches" instead of the normal paginated view.
    const filterActive = !!(f.installationType || f.type || f.search);
    const dropdownFilterActive = !!(f.installationType || f.type);

    matched.forEach((card, i) => {
      card.style.display = filterActive || i < state.visibleCount ? '' : 'none';
    });

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

  function wireSearch() {
    const MIN_CHARS = 4;
    let debounceTimer;

    function runSearch(value) {
      const q = (value || '').trim();
      // Only treat as an active search at 4+ chars; otherwise clear it.
      state.filters.search = q.length >= MIN_CHARS ? q : '';
      resetPage();
      applyFilters();
    }

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

  fetch(API.url+"?limit=0", { headers: { 'Content-Type': 'application/json', 'x-api-key': API.key } })
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

      console.log('[resources] loaded ' + state.allResources.length + ' resources');
    })
    .catch((err) => {
      console.error('[resources] fetch failed:', err);
    });
}
