// Technical drawings library viewer: fetches the technical-collections API,
// renders one card per drawing, and filters by library/category/search.
// `data.docs` is a list of libraries (e.g. "Vertical over cavity"), each
// holding its own drawings in `.content` plus bulk download links for the
// whole library. No library is selected on load, so the grid stays empty
// until the user picks one from the library filter.
const API = {
  url: 'https://cms.nuwall.co.nz/api/technical-collections',
  key: 'nk_99b79c6d5168840d0b11a35e1953d2c1b5f38c6d0b6970cbaf0e69abfe8424ff',
};

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

  const state = {
    allLibraries: [],
    filters: { library: '', category: '', search: '' },
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

  function libraryValue(library) {
    return library.code || String(library.id);
  }

  // Lazily swap in real thumbnail URLs as cards scroll into view, so we
  // don't fire dozens of image requests at once (the API rejects bursts).
  function lazyLoadImages() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          delete img.dataset.src;
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });

    grid.querySelectorAll('img[data-src]').forEach((img) => observer.observe(img));
  }

  // Anchor tags can't send custom headers, so bulk "download all" links are
  // fetched here with the API key and handed to the browser as a blob.
  function filenameFromResponse(res, fallback) {
    const cd = res.headers.get('content-disposition') || '';
    const match = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    return match ? decodeURIComponent(match[1]) : fallback;
  }

  function downloadWithApiKey(url, fallbackName) {
    return fetch(url, { headers: { 'x-api-key': API.key } })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const filename = filenameFromResponse(res, fallbackName);
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

  function resetPage() {
    state.visibleCount = state.itemsPerPage;
  }

  // ---- card rendering --------------------------------------------------

  function makeCard(doc, library) {
    const card = template.cloneNode(true);
    card.removeAttribute('data-nw-template');
    card.style.display = '';

    const img = card.querySelector('.cad-lib-item-image img');
    if (img) {
      const realSrc = doc.imageFile && (doc.imageFile.thumbnailURL || doc.imageFile.url);
      img.src = 'https://cdn.prod.website-files.com/plugins/Basic/assets/placeholder.60f9b1840c.svg';
      if (realSrc) img.dataset.src = realSrc;
      img.alt = doc.name || '';
    }

    const nameEl = card.querySelector('.is-bold');
    if (nameEl) nameEl.textContent = doc.name || '';

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

    card.setAttribute('data-library', libraryValue(library));
    card.setAttribute('data-category', (doc.cat || []).join(' '));
    card.setAttribute('data-name', (doc.name || '').toLowerCase());

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

  // ---- filtering ---------------------------------------------------------

  function applyFilters() {
    const f = state.filters;
    const matched = [];

    grid.querySelectorAll('.cad-lib-content-item:not([data-nw-template])').forEach((card) => {
      // No library selected yet — keep the grid empty rather than showing everything.
      const matchLibrary = !!f.library && card.getAttribute('data-library') === f.library;
      const matchCategory = !f.category || card.getAttribute('data-category').split(' ').indexOf(toKebab(f.category)) !== -1;
      const matchSearch = !f.search || card.getAttribute('data-name').indexOf(f.search.toLowerCase()) !== -1;

      card.style.display = 'none';
      if (matchLibrary && matchCategory && matchSearch) {
        matched.push(card);
      }
    });

    matched.forEach((card, i) => {
      card.style.display = i < state.visibleCount ? '' : 'none';
    });

    const viewMoreWrapper = document.querySelector('.cad-lib-content-view-more');
    if (viewMoreWrapper) {
      viewMoreWrapper.style.display = matched.length > state.visibleCount ? '' : 'none';
    }
  }

  // ---- selected-library detail panel --------------------------------------

  function updateLibraryDetails(library) {
    const headerEl = document.querySelector('.library-header');
    if (headerEl) headerEl.textContent = library.name || '';

    const branzEl = document.querySelector('.library-branz-number');
    if (branzEl) {
      if (library.branzAppraisal) {
        branzEl.textContent = 'BRANZ ' + library.branzAppraisal;
        branzEl.style.display = '';
      } else {
        branzEl.style.display = 'none';
      }
    }

    const counterEl = document.querySelector('.library-drawing-counter');
    if (counterEl) {
      counterEl.textContent = (library.content || []).length + ' Drawings';
    }

    const bulkPdf = document.querySelector('[data-role="bulk-pdf"]');
    if (bulkPdf) {
      if (library.downloadPdfUrl) {
        bulkPdf.href = '#';
        bulkPdf.removeAttribute('target');
        bulkPdf.style.display = '';
        bulkPdf.onclick = (e) => {
          e.preventDefault();
          downloadWithApiKey(library.downloadPdfUrl, toKebab(library.name || 'drawings') + '-pdf.zip').catch((err) => {
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
          downloadWithApiKey(library.downloadDwgUrl, toKebab(library.name || 'drawings') + '-dwg.zip').catch((err) => {
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
          resetPage();
          state.filters.library = libraryValue(library);
          updateDropdownLabel(link, library.name);
          updateLibraryDetails(library);
          applyFilters();
          closeDropdown(link);
          showContentWrapper();
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
        resetPage();
        state.filters.category = label;
        updateDropdownLabel(link, label);
        applyFilters();
        closeDropdown(link);
      });
    });

    document.querySelectorAll('[fs-cmsfilter-field="category"][fs-cmsfilter-reset]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        resetPage();
        state.filters.category = '';
        updateDropdownLabel(link, 'All');
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

  // ---- init ------------------------------------------------------------

  fetch(API.url, { headers: { 'Content-Type': 'application/json', 'x-api-key': API.key } })
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then((data) => {
      state.allLibraries = data.docs || [];

      renderCards();

      safe('library', wireLibrary);
      safe('category', wireCategory);
      safe('search', wireSearch);
      safe('view-more', wireViewMore);

      console.log('[cad] loaded ' + state.allLibraries.length + ' libraries');
    })
    .catch((err) => {
      console.error('[cad] fetch failed:', err);
    });
}
