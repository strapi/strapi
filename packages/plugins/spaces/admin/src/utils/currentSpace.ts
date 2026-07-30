/**
 * The active workspace is client-side state: a slug in localStorage, attached
 * to every backend request as the `X-Strapi-Space-Id` header by the fetch
 * interceptor installed in `admin/src/index.ts`.
 *
 * An admin is ALWAYS in a workspace — there is no "all workspaces" mode in the
 * admin. With nothing stored we fall back to the seeded `default` workspace;
 * if the stored slug stops existing (renamed install, archived space), the
 * SpaceSwitcher self-heals by selecting the first active workspace.
 */
const STORAGE_KEY = 'strapi-spaces:current-slug';

const DEFAULT_SPACE_SLUG = 'default';

const getCurrentSpaceSlug = (): string => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SPACE_SLUG;
  } catch {
    return DEFAULT_SPACE_SLUG;
  }
};

const setCurrentSpaceSlug = (slug: string): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, slug);
  } catch {
    // Storage unavailable (private browsing hard mode) — the switcher simply
    // won't persist across reloads.
  }
};

export { getCurrentSpaceSlug, setCurrentSpaceSlug, DEFAULT_SPACE_SLUG };
