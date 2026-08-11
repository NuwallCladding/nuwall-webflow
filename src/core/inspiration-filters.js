// Inspiration page CMS filters: profile/sector pill filter groups, live
// search, and empty-state + URL sync — all driven by `data-filter-*`
// attributes on the CMS grid. Pills are always visible; there is no
// per-group open/close or per-pill fade in/out.
const CONFIG = {
  MIN_SEARCH: 4, // live search kicks in once the query reaches this length
};

export function initInspirationFilters() {
  if (!document.querySelector('[data-filter-card]')) return;

  // Each group holds at most one active value — selecting a pill replaces
  // whatever was previously active in that group.
  const state = {
    active: {
      profile: null,
      sector: null,
    },
    searchActive: false,
  };

  // ---- DOM helpers -------------------------------------------------

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  const getCards = () => $$('[data-filter-card]');
  const getGroupEl = (group) => $(`[data-filter-group="${group}"]`);

  function groupOfPill(pill) {
    const el = pill.closest('[data-filter-group]');
    return el ? el.getAttribute('data-filter-group') : null;
  }

  const getGroupPills = (group) =>
    $$('.filter-item', getGroupEl(group)).filter((p) => groupOfPill(p) === group);

  const cardValues = (card, group) =>
    $$(`[data-filter-set="${group}"]`, card).map((el) => el.textContent.trim().toLowerCase());

  // ---- Mobile dropdowns (union with pills) ----------------------------
  // Mobile swaps the pill groups for `.resource-filter-drowpdown` selects —
  // same component drawings-viewer.js/resource-viewer.js use. The "profile"
  // pill group surfaces as data-res-filter="series" on mobile (its values
  // are product series names); "sector" keeps its name on both.
  const DROPDOWN_FILTER_KEY = { profile: 'series', sector: 'sector' };

  const getDropdownEl = (group) =>
    $(`.resource-filter-drowpdown[data-res-filter="${DROPDOWN_FILTER_KEY[group]}"]`);

  // Captured before any interaction so "All" can restore each dropdown's
  // exact default label.
  const dropdownDefaults = {};
  Object.keys(DROPDOWN_FILTER_KEY).forEach((group) => {
    const dd = getDropdownEl(group);
    const placeholder = dd ? dd.querySelector('.filter-placeholder') : null;
    dropdownDefaults[group] = placeholder ? placeholder.textContent.trim() : 'All';
  });

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

  function updateDropdownLabel(group, text) {
    const dd = getDropdownEl(group);
    if (!dd) return;
    const label = dd.querySelector('.filter-placeholder');
    if (!label) return;
    label.textContent = text;
    label.classList.toggle('is-selected', text !== dropdownDefaults[group]);
  }

  // Single source of truth for both pills and mobile dropdowns — keeps
  // whichever one the user didn't touch in sync with the one they did.
  function setActiveFilter(group, val, options) {
    if (!(group in state.active)) return;
    state.active[group] = val;

    getGroupPills(group).forEach((p) => {
      p.classList.toggle('is-active', val !== null && p.getAttribute('data-filter-item').toLowerCase() === val);
    });

    if (val === null) {
      updateDropdownLabel(group, dropdownDefaults[group]);
    } else {
      const pill = getGroupPills(group).find((p) => p.getAttribute('data-filter-item').toLowerCase() === val);
      const label = pill ? (pill.querySelector('p') || pill).textContent.trim() : val;
      updateDropdownLabel(group, label);
    }

    if (!options || !options.fromURL) applyFilters();
  }

  function wireMobileDropdown(group) {
    const dd = getDropdownEl(group);
    if (!dd) return;
    const nav = dd.querySelector('nav');
    if (!nav) return;

    nav.innerHTML = '';

    const allLink = document.createElement('a');
    allLink.setAttribute('href', '#');
    allLink.className = 'resources-search-fitler-item-5 w-dropdown-link';
    allLink.textContent = 'All';
    nav.appendChild(allLink);
    allLink.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveFilter(group, null);
      closeDropdown(allLink);
    });

    getGroupPills(group).forEach((pill) => {
      const value = pill.getAttribute('data-filter-item').toLowerCase();
      const label = (pill.querySelector('p') || pill).textContent.trim();

      const link = document.createElement('a');
      link.setAttribute('href', '#');
      link.className = 'resources-search-fitler-item-5 w-dropdown-link';
      link.textContent = label;
      nav.appendChild(link);
      link.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveFilter(group, value);
        closeDropdown(link);
      });
    });
  }

  // ---- Core filter logic & URL sync ----------------------------------

  function applyFilters() {
    if (state.searchActive) return;

    const hasProfile = state.active.profile !== null;
    const hasSector = state.active.sector !== null;
    let count = 0;

    getCards().forEach((card) => {
      const profileValues = cardValues(card, 'profile');
      const sectorValues = cardValues(card, 'sector');

      const profileMatch = !hasProfile || profileValues.includes(state.active.profile);
      const sectorMatch = !hasSector || sectorValues.includes(state.active.sector);

      const show = profileMatch && sectorMatch;
      card.style.display = show ? '' : 'none';
      if (show) count++;
    });

    const emptyEl = $('[data-filter-empty]');
    if (emptyEl) emptyEl.style.display = count === 0 ? 'block' : 'none';

    updateURL();
  }

  function updateURL() {
    const params = new URLSearchParams();

    if (state.active.profile) params.set('profile', state.active.profile);
    if (state.active.sector) params.set('sector', state.active.sector);

    const newURL = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    history.replaceState(null, '', newURL);
  }

  function applyFromURL() {
    const params = new URLSearchParams(window.location.search);

    // Only the first value is honoured per group (single-select), in case
    // an old comma-separated link is still floating around.
    const profileVal = params.get('profile') ? params.get('profile').split(',')[0].toLowerCase() : null;
    const sectorVal = params.get('sector') ? params.get('sector').split(',')[0].toLowerCase() : null;

    if (profileVal) setActiveFilter('profile', profileVal, { fromURL: true });
    if (sectorVal) setActiveFilter('sector', sectorVal, { fromURL: true });

    applyFilters();
  }

  // ---- Click handling (pills, close icons) ------------------------------

  function handleDocumentClick(e) {
    const icon = e.target.closest('.filter-icon-close');
    if (icon) {
      e.stopPropagation();
      const pill = icon.closest('.filter-item');
      if (!pill) return;
      const group = groupOfPill(pill);
      if (!group) return;

      setActiveFilter(group, null);
      return;
    }

    const pill = e.target.closest('.filter-item');
    if (!pill) return;
    const group = groupOfPill(pill);
    if (!group) return;

    if (!(group in state.active)) return;

    const val = pill.getAttribute('data-filter-item').toLowerCase();
    const wasActive = state.active[group] === val;

    setActiveFilter(group, wasActive ? null : val);
  }

  // ---- Search (live, min CONFIG.MIN_SEARCH characters) --------------------

  function applySearch() {
    const input = document.getElementById('inspiration-search');
    if (!input) return;
    const query = input.value.trim().toLowerCase();

    if (query === '') {
      state.searchActive = false;
      applyFilters();
      return;
    }

    state.searchActive = true;
    let count = 0;

    getCards().forEach((card) => {
      const text = card.textContent.trim().toLowerCase();
      const show = text.includes(query);
      card.style.display = show ? '' : 'none';
      if (show) count++;
    });

    const emptyEl = $('[data-filter-empty]');
    if (emptyEl) emptyEl.style.display = count === 0 ? 'block' : 'none';
  }

  function setupSearch() {
    const searchInput = document.getElementById('inspiration-search');

    if (searchInput) {
      const searchForm = searchInput.closest('form');
      if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
          e.preventDefault();
          applySearch();
        });
      }

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applySearch();
        }
      });

      // Live search as the user types, once the query reaches MIN_SEARCH
      // characters; below that (or empty) it falls back to the pill filters.
      searchInput.addEventListener('input', function () {
        const query = this.value.trim();
        if (query.length >= CONFIG.MIN_SEARCH) {
          applySearch();
        } else {
          state.searchActive = false;
          applyFilters();
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (e.target.closest('.search-icon-submit')) applySearch();
    });
  }

  // ---- Init ----------------------------------------------------------

  document.addEventListener('click', handleDocumentClick);
  setupSearch();
  wireMobileDropdown('profile');
  wireMobileDropdown('sector');

  applyFromURL();
}
