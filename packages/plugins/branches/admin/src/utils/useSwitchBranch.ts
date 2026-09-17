import * as React from 'react';

import { adminApi } from '@strapi/admin/strapi-admin';
import { useDispatch, useStore } from 'react-redux';

import { getCurrentBranchSlug, setCurrentBranchSlug, subscribeToBranch } from './currentBranch';

/**
 * Switches the active branch without a reload and without the "Christmas
 * tree" effect: persist the slug, then **invalidate** (never reset) every tag
 * currently provided on the shared `adminApi` slice so mounted screens
 * refetch under the new header while keeping their data on screen.
 */
export const useSwitchBranch = () => {
  const dispatch = useDispatch();
  const store = useStore();

  return React.useCallback(
    (slug: string) => {
      if (slug === getCurrentBranchSlug()) {
        return;
      }
      setCurrentBranchSlug(slug);

      const apiState = (store.getState() as Record<string, unknown>)[adminApi.reducerPath] as
        | { provided?: Record<string, unknown> & { tags?: Record<string, unknown> } }
        | undefined;
      const providedByType = apiState?.provided?.tags ?? apiState?.provided ?? {};
      const tagTypes = Object.keys(providedByType);

      if (tagTypes.length > 0) {
        dispatch(
          adminApi.util.invalidateTags(
            tagTypes as Parameters<typeof adminApi.util.invalidateTags>[0]
          )
        );
      }
    },
    [dispatch, store]
  );
};

/** The current slug as React state (re-renders on switches from any picker). */
export const useCurrentBranchSlug = () => {
  const [slug, setSlug] = React.useState(getCurrentBranchSlug);

  React.useEffect(() => subscribeToBranch(() => setSlug(getCurrentBranchSlug())), []);

  return slug;
};
