// Inspiration page CMS filters: profile/sector pill filter groups, live
// search, and empty-state + URL sync — all driven by `data-filter-*`
// attributes on the CMS grid.
const CONFIG = {
  STAGGER: 0,
  FADE: 700,
  FADE_OUT: 200,
  PILL_DISPLAY: 'flex',
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
    pillTimers: new Map(),
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

  const isGroupOpen = (group) => {
    const el = getGroupEl(group);
    return el ? el.classList.contains('is-open') : false;
  };

  // ---- Pill timers (show / hide) ------------------------------------

  function showPill(pill, delay) {
    clearTimeout(state.pillTimers.get(pill));
    const id = setTimeout(() => {
      pill.style.display = CONFIG.PILL_DISPLAY;
      void pill.offsetHeight;
      pill.classList.add('is-visible');
    }, delay || 0);
    state.pillTimers.set(pill, id);
  }

  function hidePill(pill) {
    clearTimeout(state.pillTimers.get(pill));
    pill.classList.remove('is-visible');
    const id = setTimeout(() => {
      pill.style.display = 'none';
    }, CONFIG.FADE_OUT);
    state.pillTimers.set(pill, id);
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

    if (profileVal) {
      state.active.profile = profileVal;
      const pill = getGroupPills('profile').find(
        (p) => p.getAttribute('data-filter-item').toLowerCase() === profileVal
      );
      if (pill) pill.classList.add('is-active');
      openGroup('profile');
    }

    if (sectorVal) {
      state.active.sector = sectorVal;
      const pill = getGroupPills('sector').find(
        (p) => p.getAttribute('data-filter-item').toLowerCase() === sectorVal
      );
      if (pill) pill.classList.add('is-active');
      openGroup('sector');
    }

    applyFilters();
  }

  // ---- Group open / close / clear ------------------------------------

  function openGroup(group) {
    const groupEl = getGroupEl(group);
    if (!groupEl) return;
    groupEl.classList.add('is-open');

    const triggerEl = $(`[data-filter-target="${group}"]`);
    if (triggerEl) triggerEl.classList.add('is-open');

    getGroupPills(group).forEach((pill, i) => {
      if (pill.classList.contains('is-visible')) return;
      showPill(pill, i * CONFIG.STAGGER);
    });
  }

  function closeGroup(group) {
    const groupEl = getGroupEl(group);
    getGroupPills(group).forEach(hidePill);
    if (groupEl) {
      setTimeout(() => {
        groupEl.classList.remove('is-open');
      }, CONFIG.FADE_OUT);
    }

    const triggerEl = $(`[data-filter-target="${group}"]`);
    if (triggerEl) triggerEl.classList.remove('is-open');
  }

  // Not currently wired to any trigger, kept for parity with the original
  // (a "clear this group" control can call it directly if one is added).
  function clearGroupActive(group) {
    state.active[group] = null;
    getGroupPills(group).forEach((pill) => {
      pill.classList.remove('is-active');
    });
  }

  // ---- Click handling (triggers, pills, close icons) --------------------

  function handleTrigger(group) {
    if (isGroupOpen(group)) {
      closeGroup(group);
    } else {
      openGroup(group);
    }
  }

  function handleDocumentClick(e) {
    const trigger = e.target.closest('[data-filter-target]');
    if (trigger) {
      handleTrigger(trigger.getAttribute('data-filter-target'));
      return;
    }

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
    if (!pill || pill.hasAttribute('data-filter-target')) return;
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

  ['profile', 'sector'].forEach((group) => {
    const groupEl = getGroupEl(group);
    if (groupEl) groupEl.classList.remove('is-open');
    getGroupPills(group).forEach((pill) => {
      pill.style.display = 'none';
      pill.classList.remove('is-visible', 'is-active');
    });
  });

  applyFromURL();
}
