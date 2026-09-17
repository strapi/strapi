import * as React from 'react';

import { useAuth } from '@strapi/admin/strapi-admin';

import { DEFAULT_CHANNEL_SLUG } from '../constants';
import { useGetMineChannelsQuery, type Channel } from '../services/channels';
import { getCurrentChannelOwner } from '../utils/currentChannel';
import { useCurrentChannelSlug, useSwitchChannel } from '../utils/useSwitchChannel';

/** Loading-time stand-in until the seeded base channel arrives from the server. */
const FALLBACK_DEFAULT: Channel = {
  id: 0,
  slug: DEFAULT_CHANNEL_SLUG,
  name: 'Default',
  color: null,
  archived: false,
  isDefault: true,
  order: -1,
};

/**
 * The active channel list, the seeded base channel pinned first.
 * Self-heals: a stored slug that no longer resolves (archived, deleted,
 * other workspace) or that another admin user stored on this browser falls
 * back to the base.
 */
export const useChannels = () => {
  const { data, isLoading } = useGetMineChannelsQuery();
  const slug = useCurrentChannelSlug();
  const switchChannel = useSwitchChannel();
  const userId = useAuth('useChannels', (state) => state.user?.id);

  const channels = React.useMemo<Channel[]>(() => {
    const list = [...(data ?? [])].sort((a, b) =>
      a.slug === DEFAULT_CHANNEL_SLUG ? -1 : b.slug === DEFAULT_CHANNEL_SLUG ? 1 : 0
    );
    return list.some((channel) => channel.slug === DEFAULT_CHANNEL_SLUG)
      ? list
      : [FALLBACK_DEFAULT, ...list];
  }, [data]);
  const others = React.useMemo<Channel[]>(
    () => channels.filter((channel) => channel.slug !== DEFAULT_CHANNEL_SLUG),
    [channels]
  );
  const current =
    channels.find((channel) => channel.slug === slug) ??
    channels.find((channel) => channel.slug === DEFAULT_CHANNEL_SLUG) ??
    FALLBACK_DEFAULT;

  React.useEffect(() => {
    if (slug === DEFAULT_CHANNEL_SLUG) {
      return;
    }
    const owner = getCurrentChannelOwner();
    if (owner && userId != null && owner !== String(userId)) {
      switchChannel(DEFAULT_CHANNEL_SLUG);
      return;
    }
    if (data && !data.some((channel) => channel.slug === slug)) {
      switchChannel(DEFAULT_CHANNEL_SLUG);
    }
  }, [data, slug, switchChannel, userId]);

  return {
    isLoading,
    channels,
    others,
    current,
    currentSlug: slug,
    isOnDefault: current.slug === DEFAULT_CHANNEL_SLUG,
    switchChannel,
  };
};
