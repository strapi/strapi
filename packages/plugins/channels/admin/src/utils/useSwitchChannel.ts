import * as React from 'react';

import { adminApi, useAuth } from '@strapi/admin/strapi-admin';
import { useDispatch } from 'react-redux';

import { getCurrentChannelSlug, setCurrentChannelSlug, subscribeToChannel } from './currentChannel';

/**
 * Tags to refetch on a switch. A channel only changes DOCUMENT content —
 * unlike a workspace switch, the admin shell (menus, settings, permissions)
 * is untouched, so invalidating everything only produces a screen-wide
 * refetch flash for nothing.
 */
const CONTENT_TAG_TYPES = [
  'Document',
  'Relations',
  'CountDocuments',
  'RecentDocumentList',
  'ChannelOverrides',
];

/**
 * Switches the active channel without a reload: persist the slug (stamped
 * with the current admin user), then **invalidate** (never reset) the
 * content tags so mounted screens refetch under the new header while keeping
 * their data on screen. The form remount rides the document render-context
 * key registered in `index.ts`.
 */
export const useSwitchChannel = () => {
  const dispatch = useDispatch();
  const userId = useAuth('useSwitchChannel', (state) => state.user?.id);

  return React.useCallback(
    (slug: string) => {
      if (slug === getCurrentChannelSlug()) {
        return;
      }
      setCurrentChannelSlug(slug, userId != null ? String(userId) : null);

      dispatch(
        adminApi.util.invalidateTags(
          CONTENT_TAG_TYPES as Parameters<typeof adminApi.util.invalidateTags>[0]
        )
      );
    },
    [dispatch, userId]
  );
};

/** The current slug as React state (re-renders on switches from any picker). */
export const useCurrentChannelSlug = () => {
  const [slug, setSlug] = React.useState(getCurrentChannelSlug);

  React.useEffect(() => subscribeToChannel(() => setSlug(getCurrentChannelSlug())), []);

  return slug;
};
