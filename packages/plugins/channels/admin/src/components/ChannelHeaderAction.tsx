import { unstable_useDocumentLayout as useDocumentLayout } from '@strapi/content-manager/strapi-admin';
import { Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../utils/getTranslation';

import { ChannelDot } from './ChannelDot';
import { useChannels } from './useChannels';

import type { HeaderActionComponent } from '@strapi/content-manager/strapi-admin';

type ChannelsLayoutOptions = { channels?: { enabled?: boolean } };

/**
 * Edit-view header picker (same seam as i18n's locale picker), first in the
 * header. Override details live on the field badges and the side panel.
 */
export const ChannelHeaderAction: HeaderActionComponent = ({ model }) => {
  const { formatMessage } = useIntl();
  const { channels, others, current, switchChannel } = useChannels();
  const {
    edit: { options },
  } = useDocumentLayout(model);

  const enabled = (options as ChannelsLayoutOptions).channels?.enabled === true;

  if (!enabled || others.length === 0) {
    return null;
  }

  return {
    label: formatMessage({ id: getTranslation('picker.label'), defaultMessage: 'Channel' }),
    value: current.slug,
    options: channels.map((channel) => ({
      value: channel.slug,
      label: channel.name,
      startIcon: <ChannelDot color={channel.color} />,
    })),
    onSelect: (value: string) => switchChannel(value),
    customizeContent: (value: string) => {
      const channel = channels.find((candidate) => candidate.slug === value);
      return (
        <Flex gap={2} alignItems="center">
          <ChannelDot color={channel?.color ?? null} />
          <Typography ellipsis>{channel?.name ?? value}</Typography>
        </Flex>
      );
    },
  };
};
