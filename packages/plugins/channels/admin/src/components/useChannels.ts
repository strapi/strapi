import * as React from 'react';

import { useAuth } from '@strapi/admin/strapi-admin';

import { DEFAULT_CHANNEL_SLUG } from '../constants';
import { useGetMineChannelsQuery, type Channel } from '../services/channels';
import { getCurrentChannelOwner } from '../utils/currentChannel';
import { useCurrentChannelSlug, useSwitchChannel } from '../utils/useSwitchChannel';

/** The virtual base channel, first in every picker. */
const DEFAULT_CHANNEL: Channel = {
  id: 0,
  slug: DEFAULT_CHANNEL_SLUG,
  name: 'Default',
  color: null,
  archived: false,
  order: -1,
};

/**
 * The active channel list with the virtual Default resolved first.
 * Self-heals: a stored slug that no longer resolves (archived, deleted,
 * other workspace) or that another admin user stored on this browser falls
 * back to the base.
 */
export const useChannels = () => {
  const { data, isLoading } = useGetMineChannelsQuery();
  const slug = useCurrentChannelSlug();
  const switchChannel = useSwitchChannel();
  const userId = useAuth('useChannels', (state) => state.user?.id);

  const others = React.useMemo<Channel[]>(() => data ?? [], [data]);
  const channels = React.useMemo<Channel[]>(() => [DEFAULT_CHANNEL, ...others], [others]);
  const current = channels.find((channel) => channel.slug === slug) ?? DEFAULT_CHANNEL;

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
