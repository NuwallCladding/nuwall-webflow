// Profiles page: hovering a series name shows that series' profile items and
// swaps the active profile image (flat CMS list, matched by data-profile-image).
// Hovering a profile item within the active series previews its own image;
// a mobile dropdown mirrors the same series/profile switching.
export function initProfileSwitcher() {
  const profileImages = document.querySelectorAll('.profile_images .w-dyn-item');
  if (!profileImages.length) return;

  function setActiveImage(profileName) {
    profileImages.forEach((img) => {
      const imgEl = img.matches('[data-profile-image]')
        ? img
        : img.querySelector('[data-profile-image]');
      const name = imgEl ? imgEl.getAttribute('data-profile-image') : null;
      img.classList.toggle('is-active', name === profileName);
    });
  }

  // Exclude series-name elements, which also carry data-series.
  function isProfileItem(el) {
    return el
      && el.hasAttribute('data-series')
      && el.hasAttribute('data-profile')
      && !el.matches('.series_name-flex')
      && !el.querySelector('.series_name-flex');
  }

  const profileItems = Array.prototype.filter.call(
    document.querySelectorAll('[data-series][data-profile]'),
    isProfileItem
  );

  function closestProfileItem(el) {
    while (el && el !== document) {
      if (isProfileItem(el)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function showSeriesProfiles(seriesName) {
    profileItems.forEach((item) => {
      item.style.display = item.getAttribute('data-series') === seriesName ? 'block' : 'none';
    });
  }

  // ─── Desktop: series name list ────────────────────────────────────────────
  const names = document.querySelectorAll('.series_names .w-dyn-item');

  function activateSeries(name) {
    names.forEach((n) => n.classList.remove('is-active'));
    name.classList.add('is-active');

    const link = name.querySelector('.series_name-flex');
    const defaultProfile = link ? link.getAttribute('data-profile') : null; // series' default profile
    const seriesLabel = name.getAttribute('data-series')
      || (link ? link.getAttribute('data-series') : null);

    // Show this series' profile items, hide the rest
    if (seriesLabel) showSeriesProfiles(seriesLabel);

    // Show the series' default profile image immediately
    if (defaultProfile) setActiveImage(defaultProfile);
  }

  if (names.length) {
    activateSeries(names[0]);

    names.forEach((name) => {
      name.addEventListener('mouseenter', () => {
        activateSeries(name);
      });
    });
  }

  // ─── Mobile: dropdown ─────────────────────────────────────────────────────
  const dropdown = document.getElementById('series-dropdown');

  if (dropdown) {
    const toggle = dropdown.querySelector('.w-dropdown-toggle');
    const toggleText = toggle ? toggle.querySelector('.text-color-brand-white') : null;
    const options = dropdown.querySelectorAll('.w-dyn-item');

    if (options.length && toggleText) {
      const firstOption = options[0].querySelector('.series-list-option');
      if (firstOption) toggleText.textContent = firstOption.textContent;
    }

    options.forEach((option) => {
      const listOption = option.querySelector('.series-list-option');
      if (!listOption) return;

      listOption.addEventListener('click', function (e) {
        e.preventDefault();
        if (toggleText) toggleText.textContent = this.textContent;

        const dropList = dropdown.querySelector('.w-dropdown-list');
        if (dropList) dropList.classList.remove('w--open');
        toggle.classList.remove('w--open');
        toggle.setAttribute('aria-expanded', 'false');

        const seriesLabel = option.getAttribute('data-series')
          || listOption.getAttribute('data-series');
        const defaultProfile = option.getAttribute('data-profile')
          || listOption.getAttribute('data-profile');

        if (seriesLabel) showSeriesProfiles(seriesLabel);
        if (defaultProfile) setActiveImage(defaultProfile);
      });
    });
  }

  // ─── Profile item hover: swap to that profile's image ─────────────────────
  const desktopWrapper = document.querySelector('.series-name-wrapper');

  if (desktopWrapper) {
    desktopWrapper.addEventListener('mouseover', (e) => {
      const profileItem = closestProfileItem(e.target);
      if (!profileItem) return;

      const profileName = profileItem.getAttribute('data-profile');
      if (profileName) setActiveImage(profileName);
    });

    desktopWrapper.addEventListener('mouseout', (e) => {
      const profileItem = closestProfileItem(e.target);
      if (!profileItem) return;

      // Don't revert if moving to another profile item
      if (e.relatedTarget && closestProfileItem(e.relatedTarget)) return;

      // Revert to the active series' default profile image
      const activeName = document.querySelector('.series_names .w-dyn-item.is-active');
      const link = activeName ? activeName.querySelector('.series_name-flex') : null;
      const defaultProfile = link ? link.getAttribute('data-profile') : null;
      if (defaultProfile) setActiveImage(defaultProfile);
    });
  }
}
