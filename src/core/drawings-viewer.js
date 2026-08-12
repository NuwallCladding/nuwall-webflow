// Technical drawings library viewer: fetches the technical-collections API,
// renders one card per drawing, and filters by library/category/search.
// `data.docs` is a list of libraries (e.g. "Vertical over cavity"), each
// holding its own drawings in `.content` plus bulk download links for the
// whole library. No library is selected on load, so the grid stays empty
// until the user picks one from the library filter.
import { withButtonSpinner } from '../utils/button-spinner.js';
import { cms } from '../utils/cms-client.js';
import { loadImageInto } from '../utils/image-load-queue.js';

const COLLECTIONS_PATH = '/technical-collections';
const COLLECTIONS_ZIP_PATH = '/technical-collections/download-zip';

export function initDrawingsViewer() {
  const grid = document.querySelector('.cad-lib-grid');
  if (!grid) return;

  const template = grid.querySelector('.cad-lib-content-item');
  if (!template) {
    console.warn('[cad] template not found — drawings viewer aborted');
    return;
  }
  template.setAttribute('data-nw-template', 'true');
  template.style.display = 'none';

  const searchInput = document.querySelector('.cad-lib-search-input');
  const searchBtn = document.querySelector('[data-role="search-btn"]');
  const categoryDropdown = document.querySelector('.resource-filter-drowpdown[data-res-filter="category"]');
  const searchForm = searchInput ? searchInput.closest('form') : document.querySelector('.cad-lib-search-form');
  const categoryDdWrapper = document.querySelector('.cad-categories-dd');
  const searchWrapper = document.querySelector('.cad-lib-search-wrapper');

  // Captured before any filter interaction so the clear-filter button can
  // restore the category dropdown's exact pre-selection label/state.
  const categoryPlaceholder = categoryDropdown ? categoryDropdown.querySelector('.filter-placeholder') : null;
  const categoryPlaceholderDefaultText = categoryPlaceholder ? categoryPlaceholder.textContent : '';

  const state = {
    allLibraries: [],
    currentLibrary: null,
    filters: { library: '', category: '', search: '' },
    matchedIds: [],
    selectedIds: new Set(),
  };

  // No library selected yet — grey out category filter and search until
  // wireLibrary's click handler enables them.
  setPreLibraryControlsDisabled(true);

  // ---- helpers -------------------------------------------------------

  function toKebab(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function libraryValue(library) {
    return library.code || String(library.id);
  }

  // Lazily swap in real thumbnail URLs as cards scroll into view — a card
  // doesn't request its thumbnail until it's actually near the viewport,
  // and even then the request goes through the shared queue (capped
  // concurrency + retry-with-backoff) rather than firing directly, so
  // scrolling past/into several cards at once can't burst the CMS with
  // simultaneous requests. loadImageInto keeps each <img> blank until its
  // thumbnail has actually loaded, then fades it in — no placeholder icon
  // or alt text flash while it waits its turn in the queue.
  function lazyLoadImages() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;
          const alt = img.dataset.alt || '';
          delete img.dataset.src;
          delete img.dataset.alt;
          observer.unobserve(img);
          loadImageInto(img, src, { alt });
        }
      });
    }, { rootMargin: '200px' });

    grid.querySelectorAll('img[data-src]').forEach((img) => observer.observe(img));
  }

  // Anchor tags can't send custom headers, so bulk "download all" links are
  // fetched here with the API key and handed to the browser as a blob.
  // The bulk endpoint may return a single merged PDF or a zip of files
  // depending on the library, so the extension is taken from the response
  // rather than assumed.
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
    return cms.fetchRaw(url)
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

  function downloadZipWithApiKey(ids, format) {
    return cms.postRaw(COLLECTIONS_ZIP_PATH, { ids, format })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const filename = filenameFromResponse(res, 'nuwall-drawings');
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

  // Category filter and search are meaningless before a library is picked
  // (there's nothing loaded yet to filter/search), so keep them greyed out
  // and inert until wireLibrary's click handler enables them.
  function setPreLibraryControlsDisabled(disabled) {
    if (categoryDropdown) {
      categoryDropdown.classList.toggle('is-disabled', disabled);
      categoryDropdown.setAttribute('aria-disabled', String(disabled));
      const toggle = categoryDropdown.querySelector('.w-dropdown-toggle');
      if (toggle) toggle.setAttribute('tabindex', disabled ? '-1' : '0');
    }
    if (searchForm) searchForm.classList.toggle('is-disabled', disabled);
    if (searchInput) searchInput.disabled = disabled;
    if (searchBtn) searchBtn.disabled = disabled;

    // These wrappers ship with opacity: 0 in markup so they're invisible
    // until a library is selected; fade them in/out alongside the disabled
    // state instead of leaving them permanently hidden.
    if (categoryDdWrapper) {
      categoryDdWrapper.style.opacity = disabled ? '0' : '1';
      categoryDdWrapper.style.pointerEvents = disabled ? 'none' : '';
    }
    if (searchWrapper) {
      searchWrapper.style.opacity = disabled ? '0' : '1';
      searchWrapper.style.pointerEvents = disabled ? 'none' : '';
    }
  }

  // ---- card rendering --------------------------------------------------

  function makeCard(doc, library) {
    const card = template.cloneNode(true);
    card.removeAttribute('data-nw-template');
    card.style.display = '';

    const img = card.querySelector('.cad-lib-item-image img');
    if (img) {
      const realSrc = doc.imageFile && (doc.imageFile.thumbnailURL || doc.imageFile.url);
      // Left blank (no src/alt) until it scrolls into view and loads —
      // see lazyLoadImages(). Avoids showing a placeholder icon/alt text
      // that then snaps to the real thumbnail with no transition.
      if (realSrc) img.dataset.src = realSrc;
      img.dataset.alt = doc.name || '';
    }

    const nameEl = card.querySelector('.drawing-name');
    if (nameEl) nameEl.textContent = doc.name || '';

    const codeEl = card.querySelector('.drawing-code');
    if (codeEl) codeEl.textContent = doc.code || '';

    const hasPdf = !!(doc.pdfFile && doc.pdfFile.url);
    const hasDwg = !!(doc.dwgFile && doc.dwgFile.url);

    const imgLink = card.querySelector('.cad-lib-item-image');
    if (imgLink) {
      if (hasPdf) {
        imgLink.href = doc.pdfFile.url;
        imgLink.setAttribute('target', '_blank');
        imgLink.setAttribute('rel', 'noopener');
      } else {
        imgLink.removeAttribute('href');
      }
    }

    const pdfLink = card.querySelector('[data-role="download-pdf"]');
    if (pdfLink) {
      if (hasPdf) {
        pdfLink.href = doc.pdfFile.url;
        pdfLink.setAttribute('target', '_blank');
        pdfLink.setAttribute('rel', 'noopener');
      } else {
        pdfLink.style.display = 'none';
      }
    }

    const dwgLink = card.querySelector('[data-role="download-dwg"]');
    if (dwgLink) {
      if (hasDwg) {
        dwgLink.href = doc.dwgFile.url;
        dwgLink.setAttribute('target', '_blank');
        dwgLink.setAttribute('rel', 'noopener');
      } else {
        dwgLink.style.display = 'none';
      }
    }

    if (!hasPdf && !hasDwg) return null;

    const checkboxField = card.querySelector('.checkbox-field');
    if (checkboxField) {
      const checkboxItem = checkboxField.querySelector('.checkbox-item') || checkboxField;
      checkboxField.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSelection(doc.id, checkboxItem);
      });
    }

    card.setAttribute('data-id', doc.id);
    card.setAttribute('data-library', libraryValue(library));
    card.setAttribute('data-category', (doc.cat || []).join(' '));
    card.setAttribute('data-name', (doc.name || '').toLowerCase());
    card.setAttribute('data-code', (doc.code || '').toLowerCase());

    return card;
  }

  function renderCards() {
    grid.querySelectorAll('.cad-lib-content-item:not([data-nw-template])').forEach((el) => el.remove());

    state.allLibraries.forEach((library) => {
      (library.content || []).forEach((doc) => {
        try {
          const card = makeCard(doc, library);
          if (card) grid.appendChild(card);
        } catch (e) {
          console.error('[cad] makeCard failed:', doc.name, e.message);
        }
      });
    });

    lazyLoadImages();
    applyFilters();
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
    const pdfBtn = document.querySelector('.selection-bulk-download-btn-pdf');
    const dwgBtn = document.querySelector('.selection-bulk-download-btn-dwg');
    const count = state.selectedIds.size;

    if (bar) bar.style.display = count ? '' : 'none';
    if (pdfBtn) pdfBtn.textContent =  'Download (' + count + ') Selected PDF';
    if (dwgBtn) dwgBtn.textContent =  'Download (' + count + ') Selected DWG';
  }

  function wireSelectionDownload() {
    const buttons = [
      { el: document.querySelector('.bulk-download-btn-pdf'), format: 'pdf' },
      { el: document.querySelector('.bulk-download-btn-dwg'), format: 'dwg' },
    ];

    buttons.forEach(({ el: btn, format }) => {
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!state.selectedIds.size) return;
        withButtonSpinner(btn, () => downloadZipWithApiKey(Array.from(state.selectedIds), format)).catch((err) => {
          console.error('[cad] selection zip download failed:', err);
        });
      });
    });
  }

  function clearSelection() {
    state.selectedIds.clear();
    grid.querySelectorAll('.checkbox-item.w--redirected-checked').forEach((checkbox) => {
      checkbox.classList.remove('w--redirected-checked');
    });
    updateSelectionBar();
  }

  function wireClearSelection() {
    const btn = document.querySelector('.clear-selected-wrapper');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      clearSelection();
    });
  }

  // ---- filtering ---------------------------------------------------------

  function applyFilters() {
    const f = state.filters;
    const matched = [];

    grid.querySelectorAll('.cad-lib-content-item:not([data-nw-template])').forEach((card) => {
      // No library selected yet — keep the grid empty rather than showing everything.
      const matchLibrary = !!f.library && card.getAttribute('data-library') === f.library;
      const matchCategory = !f.category || card.getAttribute('data-category').split(' ').indexOf(toKebab(f.category)) !== -1;
      const matchSearch =
        !f.search ||
        card.getAttribute('data-name').indexOf(f.search.toLowerCase()) !== -1 ||
        card.getAttribute('data-code').indexOf(f.search.toLowerCase()) !== -1;

      const show = matchLibrary && matchCategory && matchSearch;
      card.style.display = show ? '' : 'none';
      if (show) matched.push(card);
    });

    state.matchedIds = matched.map((card) => card.getAttribute('data-id'));

    if (state.currentLibrary) {
      const counterEl = document.querySelector('.library-drawing-counter');
      if (counterEl) counterEl.textContent = matched.length + ' Drawings';
    }

    updateLibraryHeader();
    updateClearFilterBtn();
  }

  // Only category/search count as "refining" filters here — the library
  // filter is the base selection, not something clear-filter should touch.
  function updateClearFilterBtn() {
    const btn = document.querySelector('.clear-filter-btn');
    if (!btn) return;
    const filtersActive = !!(state.filters.category || state.filters.search);
    btn.style.display = filtersActive ? '' : 'none';
  }

  // Appends "Category - Search "term"" onto the base library name whenever
  // a category or search filter is active, so the header itself signals a
  // refined (not full-library) view.
  function updateLibraryHeader() {
    const headerEl = document.querySelector('.library-header');
    if (!headerEl || !state.currentLibrary) return;

    const parts = [state.currentLibrary.name || ''];
    if (state.filters.category) parts.push(state.filters.category);
    if (state.filters.search) parts.push('Search "' + state.filters.search + '"');

    headerEl.textContent = parts.join(' - ');
  }

  // ---- selected-library detail panel --------------------------------------

  // Bulk "download all" buttons ship pointed at the library's full-set zip
  // (downloadPdfUrl/downloadDwgUrl), but once a category or search filter is
  // active they should only hand back the refined set — same zip-by-ids
  // endpoint the checkbox-selection download already uses.
  function bulkDownload(format, library) {
    const filtersActive = !!(state.filters.category || state.filters.search);
    if (filtersActive) {
      if (!state.matchedIds.length) return Promise.resolve();
      return downloadZipWithApiKey(state.matchedIds, format);
    }
    const url = format === 'pdf' ? library.downloadPdfUrl : library.downloadDwgUrl;
    return downloadWithApiKey(url, toKebab(library.name || 'drawings') + '-' + format);
  }

  function updateLibraryDetails(library) {
    state.currentLibrary = library;

    const branzEl = document.querySelector('.library-branz-number');
    if (branzEl) {
      if (library.branzAppraisal) {
        branzEl.textContent = 'BRANZ ' + library.branzAppraisal;
        branzEl.style.display = '';
      } else {
        branzEl.style.display = 'none';
      }
    }

    const bulkPdf = document.querySelector('[data-role="bulk-pdf"]');
    if (bulkPdf) {
      if (library.downloadPdfUrl) {
        bulkPdf.href = '#';
        bulkPdf.removeAttribute('target');
        bulkPdf.style.display = '';
        bulkPdf.onclick = (e) => {
          e.preventDefault();
          withButtonSpinner(bulkPdf, () => bulkDownload('pdf', library)).catch((err) => {
            console.error('[cad] bulk pdf download failed:', err);
          });
        };
      } else {
        bulkPdf.style.display = 'none';
        bulkPdf.onclick = null;
      }
    }

    const bulkDwg = document.querySelector('[data-role="bulk-dwg"]');
    if (bulkDwg) {
      if (library.downloadDwgUrl) {
        bulkDwg.href = '#';
        bulkDwg.removeAttribute('target');
        bulkDwg.style.display = '';
        bulkDwg.onclick = (e) => {
          e.preventDefault();
          withButtonSpinner(bulkDwg, () => bulkDownload('dwg', library)).catch((err) => {
            console.error('[cad] bulk dwg download failed:', err);
          });
        };
      } else {
        bulkDwg.style.display = 'none';
        bulkDwg.onclick = null;
      }
    }
  }

  // Hidden (display: none) until a library is selected; revealed once the
  // grid/header/counter/bulk-links for that library have all been updated.
  function showContentWrapper() {
    const wrapper = document.querySelector('.cad-lib-content-wrapper');
    if (wrapper) wrapper.style.display = 'block';
  }

  // ---- filter wiring -------------------------------------------------

  function safe(name, fn) {
    try {
      fn();
    } catch (e) {
      console.error('[cad] failed to wire "' + name + '":', e);
    }
  }

  function wireLibrary() {
    const dd = document.querySelectorAll('.w-dropdown')[0];
    const nav = dd ? dd.querySelector('nav') : null;
    if (!nav) return;

    nav.innerHTML = '';

    state.allLibraries
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((library) => {
        const link = document.createElement('a');
        link.setAttribute('href', '#');
        link.className = 'resources-search-fitler-item w-dropdown-link';
        link.textContent = library.name;
        nav.appendChild(link);
        link.addEventListener('click', (e) => {
          e.preventDefault();
          state.filters.library = libraryValue(library);
          updateDropdownLabel(link, library.name);
          updateLibraryDetails(library);
          applyFilters();
          closeDropdown(link);
          showContentWrapper();
          setPreLibraryControlsDisabled(false);
        });
      });
  }

  function wireCategory() {
    const field = document.querySelector('[fs-cmsfilter-field="category"]');
    const nav = field ? field.closest('nav') : null;
    if (!nav) return;

    nav.querySelectorAll('a[fs-cmsfilter-field="category"]:not([fs-cmsfilter-reset])').forEach((el) => el.remove());

    const seen = {};
    const unique = [];
    state.allLibraries.forEach((library) => {
      (library.content || []).forEach((doc) => {
        (doc.cat || []).forEach((cat) => {
          if (cat && !seen[cat]) {
            seen[cat] = true;
            unique.push(cat);
          }
        });
      });
    });
    unique.sort();

    unique.forEach((cat) => {
      const label = cat.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      const link = document.createElement('a');
      link.setAttribute('fs-cmsfilter-field', 'category');
      link.setAttribute('href', '#');
      link.className = 'resources-search-fitler-item w-dropdown-link';
      link.textContent = label;
      nav.appendChild(link);
      link.addEventListener('click', (e) => {
        e.preventDefault();
        state.filters.category = label;
        updateDropdownLabel(link, label);
        applyFilters();
        closeDropdown(link);
      });
    });

    document.querySelectorAll('[fs-cmsfilter-field="category"][fs-cmsfilter-reset]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        state.filters.category = '';
        updateDropdownLabel(link, 'All');
        applyFilters();
        closeDropdown(link);
      });
    });
  }

  const SEARCH_MIN_CHARS = 2;

  function runSearch(value) {
    const q = (value || '').trim();
    // Only treat as an active search at 2+ chars; otherwise clear it.
    state.filters.search = q.length >= SEARCH_MIN_CHARS ? q : '';
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
  // libraries have loaded. Results still won't show until a library is
  // picked (search alone never populates the grid), but the term is ready
  // to go the moment the user does.
  function preloadSearchFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const term = [...params].find(([k]) => k.toLowerCase() === "searchterm")?.[1] ?? null;
    if (!term) return;
    if (searchInput) searchInput.value = term;
    runSearch(term);
  }

  // Resets category + search back to their unselected state without
  // touching the library selection (the grid stays populated).
  function wireClearFilters() {
    const btn = document.querySelector('.clear-filter-btn');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      state.filters.category = '';
      state.filters.search = '';
      if (searchInput) searchInput.value = '';
      if (categoryPlaceholder) {
        categoryPlaceholder.textContent = categoryPlaceholderDefaultText;
        categoryPlaceholder.classList.remove('is-selected');
      }
      applyFilters();
    });
  }

  // ---- init ------------------------------------------------------------

  // Hidden until a checkbox is ticked, before the fetch even resolves, so
  // it never flashes visible on load.
  const selectionBar = document.querySelector('.selection-bulk-download-bar');
  if (selectionBar) selectionBar.style.display = 'none';

  // Hidden until a category/search filter is applied, before the fetch even
  // resolves, so it never flashes visible on load.
  const clearFilterBtn = document.querySelector('.clear-filter-btn');
  if (clearFilterBtn) clearFilterBtn.style.display = 'none';

  // Pagination removed — a library maxes out at 20 drawings, so every
  // match always renders and "view more" never has anything to do.
  const viewMoreWrapper = document.querySelector('.cad-lib-content-view-more');
  if (viewMoreWrapper) viewMoreWrapper.style.display = 'none';

  cms.get(COLLECTIONS_PATH)
    .then((data) => {
      state.allLibraries = data.docs || [];

      renderCards();

      safe('library', wireLibrary);
      safe('category', wireCategory);
      safe('search', wireSearch);
      safe('clear-filters', wireClearFilters);
      safe('selection-download', wireSelectionDownload);
      safe('clear-selection', wireClearSelection);
      safe('preload-search', preloadSearchFromQuery);

      console.log('[cad] loaded ' + state.allLibraries.length + ' libraries');
    })
    .catch((err) => {
      console.error('[cad] fetch failed:', err);
    });
}
