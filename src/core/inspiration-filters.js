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

    if (profileVal) {
      state.active.profile = profileVal;
      const pill = getGroupPills('profile').find(
        (p) => p.getAttribute('data-filter-item').toLowerCase() === profileVal
      );
      if (pill) pill.classList.add('is-active');
    }

    if (sectorVal) {
      state.active.sector = sectorVal;
      const pill = getGroupPills('sector').find(
        (p) => p.getAttribute('data-filter-item').toLowerCase() === sectorVal
      );
      if (pill) pill.classList.add('is-active');
    }

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

      state.active[group] = null;
      pill.classList.remove('is-active');

      applyFilters();
      return;
    }

    const pill = e.target.closest('.filter-item');
    if (!pill) return;
    const group = groupOfPill(pill);
    if (!group) return;

    if (!(group in state.active)) return;

    const val = pill.getAttribute('data-filter-item').toLowerCase();
    const wasActive = state.active[group] === val;

    // Single-select: clear whatever else was active in this group first.
    getGroupPills(group).forEach((p) => p.classList.remove('is-active'));

    if (wasActive) {
      state.active[group] = null;
    } else {
      state.active[group] = val;
      pill.classList.add('is-active');
    }

    applyFilters();
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

  applyFromURL();
}
