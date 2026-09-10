import { adminApi, useAuth } from '@strapi/admin/strapi-admin';
import { useDispatch, useStore } from 'react-redux';

import { useSetCurrentSpaceMutation } from '../services/spaces';
import { setCurrentSpaceSlug } from './currentSpace';
import { clearEntryStateCache } from './entryStates';
import { clearInheritanceCache } from './inheritanceStates';
import { purgePersistedWorkspaceFilters } from './workspaceFilters';

/**
 * Switches the active workspace WITHOUT a full page reload and WITHOUT the
 * "Christmas tree" effect:
 *
 *   1. persist the slug (locally and server-side, per user) — the fetch
 *      interceptor reads it per request, so every request from now on carries
 *      the new `X-Strapi-Space-Id`;
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
 *
 * `{ reset: true }` replaces that invalidation with a full `resetApiState`. It
 * is for recovery only — healing a stale stored slug — where the queries on
 * screen did not merely go stale, they **failed** under the bad workspace
 * header. A rejected query provides no tags, so invalidation cannot reach it
 * and it would stay in its error state (an empty list view) until the user
 * navigated away. Resetting remounts every query, at the cost of one skeleton
 * pass the user is already looking past.
 */
interface SwitchOptions {
  /** Drop the whole cache instead of invalidating it (stale-slug recovery). */
  reset?: boolean;
}

export const useSwitchWorkspace = () => {
  const dispatch = useDispatch();
  const store = useStore();
  const [setCurrentSpace] = useSetCurrentSpaceMutation();
  // Stored next to the slug: the workspace belongs to this admin, not to this
  // browser (see currentSpace.ts).
  const userId = useAuth('useSwitchWorkspace', (state) => state.user?.id);

  return (slug: string, { reset = false }: SwitchOptions = {}) => {
    setCurrentSpaceSlug(slug, userId);
    // Whether an entry is editable depends on the workspace asking, so the
    // answers cached for the previous one are meaningless now.
    clearEntryStateCache();
    clearInheritanceCache();
    // The Content Manager mirrors list filters into localStorage and rehydrates
    // them on every visit, so a "Workspace" filter set in the default workspace
    // would follow the admin everywhere — invisible and unremovable outside
    // default (see workspaceFilters.ts).
    purgePersistedWorkspaceFilters();
    // Remembered server-side so the next login (any browser) lands here.
    setCurrentSpace({ slug }).catch(() => undefined);

    if (reset) {
      dispatch(adminApi.util.resetApiState());
      return;
    }

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
