import * as React from 'react';

import { adminApi, useAuth } from '@strapi/admin/strapi-admin';
import { useDispatch, useStore } from 'react-redux';

import { getCurrentChannelSlug, setCurrentChannelSlug, subscribeToChannel } from './currentChannel';

/**
 * Switches the active channel without a reload and without the "Christmas
 * tree" effect: persist the slug (stamped with the current admin user), then
 * **invalidate** (never reset) every tag currently provided on the shared
 * `adminApi` slice so mounted screens refetch under the new header while
 * keeping their data on screen. The form remount rides the document
 * render-context key registered in `index.ts`.
 */
export const useSwitchChannel = () => {
  const dispatch = useDispatch();
  const store = useStore();
  const userId = useAuth('useSwitchChannel', (state) => state.user?.id);

  return React.useCallback(
    (slug: string) => {
      if (slug === getCurrentChannelSlug()) {
        return;
      }
      setCurrentChannelSlug(slug, userId != null ? String(userId) : null);

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
    [dispatch, store, userId]
  );
};

/** The current slug as React state (re-renders on switches from any picker). */
export const useCurrentChannelSlug = () => {
  const [slug, setSlug] = React.useState(getCurrentChannelSlug);

  React.useEffect(() => subscribeToChannel(() => setSlug(getCurrentChannelSlug())), []);

  return slug;
};
