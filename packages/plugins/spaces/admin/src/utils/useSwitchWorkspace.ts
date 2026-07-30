import { adminApi } from '@strapi/admin/strapi-admin';
import { useDispatch, useStore } from 'react-redux';

import { setCurrentSpaceSlug } from './currentSpace';

/**
 * Switches the active workspace WITHOUT a full page reload and WITHOUT the
 * "Christmas tree" effect:
 *
 *   1. persist the slug — the fetch interceptor reads it per request, so every
 *      request from now on carries the new `X-Strapi-Space-Id`;
 *   2. **invalidate** (not reset) every tag currently provided on the shared
 *      `adminApi` slice — the single RTK slice behind the CM, i18n, spaces,
 *      roles, users and tokens endpoints. Invalidation keeps the cached data
 *      on screen while refetching in the background (stale-while-revalidate),
 *      so content swaps in place instead of every screen collapsing into
 *      skeletons the way `resetApiState` did.
 *
 * The list of tag types is read from the slice's runtime state because plugins
 * register their own types at runtime (`enhanceEndpoints({ addTagTypes })`) —
 * no static list can know them all. A type with no provided entries has
 * nothing to invalidate, so the runtime list is exactly sufficient.
 */
export const useSwitchWorkspace = () => {
  const dispatch = useDispatch();
  const store = useStore();

  return (slug: string) => {
    setCurrentSpaceSlug(slug);

    const apiState = (store.getState() as Record<string, unknown>)[adminApi.reducerPath] as
      | { provided?: Record<string, unknown> & { tags?: Record<string, unknown> } }
      | undefined;
    // RTK 1.x keys `provided` by tag type directly; RTK 2.x nests under `tags`.
    const providedByType = apiState?.provided?.tags ?? apiState?.provided ?? {};
    const tagTypes = Object.keys(providedByType);

    if (tagTypes.length > 0) {
      dispatch(
        adminApi.util.invalidateTags(tagTypes as Parameters<typeof adminApi.util.invalidateTags>[0])
      );
    }
  };
};
