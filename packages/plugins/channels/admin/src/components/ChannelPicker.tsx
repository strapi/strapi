import { useRBAC } from '@strapi/admin/strapi-admin';
import { Flex, IconButton, SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { Cog } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { PERMISSIONS } from '../constants';
import { getTranslation } from '../utils/getTranslation';

import { ChannelDot } from './ChannelDot';
import { useChannels } from './useChannels';

/**
 * Channel picker mounted in the Content Manager list view toolbar (the
 * `listView.actions` injection zone, next to i18n's locale picker), with a
 * shortcut to the settings. The select only shows once a channel exists.
 */
export const ChannelPicker = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { channels, others, current, switchChannel } = useChannels();
  const {
    allowedActions: { canRead },
  } = useRBAC(PERMISSIONS);

  if (others.length === 0) {
    return null;
  }

  return (
    <Flex gap={2} alignItems="center">
      <SingleSelect
        size="S"
        aria-label={formatMessage({
          id: getTranslation('picker.select'),
          defaultMessage: 'Select a channel',
        })}
        value={current.slug}
        onChange={(value) => switchChannel(String(value))}
        customizeContent={(value) =>
          channels.find((candidate) => candidate.slug === value)?.name ?? String(value)
        }
      >
        {channels.map((channel) => (
          <SingleSelectOption
            key={channel.slug}
            value={channel.slug}
            startIcon={<ChannelDot color={channel.color} />}
          >
            {channel.name}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      {canRead ? (
        <IconButton
          variant="tertiary"
          label={formatMessage({
            id: getTranslation('picker.manage'),
            defaultMessage: 'Manage channels',
          })}
          onClick={() => navigate('/settings/channels')}
        >
          <Cog />
        </IconButton>
      ) : null}
    </Flex>
  );
};
