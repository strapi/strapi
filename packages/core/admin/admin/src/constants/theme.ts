const RESPONSIVE_DEFAULT_SPACING = {
  initial: 4,
  medium: 6,
  large: 10,
};

const HEIGHT_TOP_NAVIGATION = '6.4rem';
const HEIGHT_TOP_NAVIGATION_MEDIUM = '5.6rem';
const WIDTH_SIDE_NAVIGATION = '23.2rem';

/**
 * The height of the global banner stack above all navigation (see `MfaBanners`), kept up to date on
 * the root element by a `ResizeObserver`. Anything positioned against the viewport top (toasts, the
 * sticky page header, the mobile burger menu) offsets by `GLOBAL_BANNERS_HEIGHT` so it never covers
 * the banners. Falls back to `0px` when no stack is mounted, so nothing moves without one.
 */
const GLOBAL_BANNERS_HEIGHT_VAR = '--strapi-global-banners-height';
const GLOBAL_BANNERS_HEIGHT = `var(${GLOBAL_BANNERS_HEIGHT_VAR}, 0px)`;

export {
  RESPONSIVE_DEFAULT_SPACING,
  HEIGHT_TOP_NAVIGATION,
  HEIGHT_TOP_NAVIGATION_MEDIUM,
  WIDTH_SIDE_NAVIGATION,
  GLOBAL_BANNERS_HEIGHT_VAR,
  GLOBAL_BANNERS_HEIGHT,
};
