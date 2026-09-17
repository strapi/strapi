import { useQueryParams } from '@strapi/admin/strapi-admin';
import { unstable_useDocumentLayout as useDocumentLayout } from '@strapi/content-manager/strapi-admin';
import { Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useGetEntryOverridesQuery } from '../services/channels';
import { getTranslation } from '../utils/getTranslation';

import { ChannelDot } from './ChannelDot';
import { useChannels } from './useChannels';

import type { HeaderActionComponent } from '@strapi/content-manager/strapi-admin';

type ChannelsLayoutOptions = { channels?: { enabled?: boolean } };

/**
 * Edit-view header picker (same seam as i18n's locale picker). The trigger
 * shows the channel and, for an existing document, how many attributes the
 * channel overrides on it.
 */
export const ChannelHeaderAction: HeaderActionComponent = ({ documentId, model }) => {
  const { formatMessage } = useIntl();
  const { channels, others, current, isOnDefault, switchChannel } = useChannels();
  const {
    edit: { options },
  } = useDocumentLayout(model);
  const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();
  const locale = query.plugins?.i18n?.locale ?? null;

  const enabled = (options as ChannelsLayoutOptions).channels?.enabled === true;
  const { data: overrides } = useGetEntryOverridesQuery(
    { model, documentId: documentId ?? '', locale },
    { skip: !enabled || !documentId || others.length === 0 }
  );

  if (!enabled || others.length === 0) {
    return null;
  }

  const overriddenCount =
    !isOnDefault && overrides?.[current.slug] ? overrides[current.slug].attributes.length : 0;

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
          {overriddenCount > 0 ? (
            <Typography variant="pi" textColor="neutral600" ellipsis>
              ·{' '}
              {formatMessage(
                {
                  id: getTranslation('picker.overrides'),
                  defaultMessage:
                    '{count, plural, one {# override} other {# overrides}} on this entry',
                },
                { count: overriddenCount }
              )}
            </Typography>
          ) : null}
        </Flex>
      );
    },
  };
};
