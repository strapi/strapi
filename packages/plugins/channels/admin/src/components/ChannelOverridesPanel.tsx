import * as React from 'react';

import {
  ConfirmDialog,
  useAPIErrorHandler,
  useNotification,
  useQueryParams,
} from '@strapi/admin/strapi-admin';
import { unstable_useDocumentLayout as useDocumentLayout } from '@strapi/content-manager/strapi-admin';
import { Badge, Button, Dialog, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useGetEntryOverridesQuery, useResetOverridesMutation } from '../services/channels';
import { getTranslation } from '../utils/getTranslation';

import { ChannelDot } from './ChannelDot';
import { useChannels } from './useChannels';

import type { PanelComponent } from '@strapi/content-manager/strapi-admin';

type ChannelsLayoutOptions = { channels?: { enabled?: boolean } };

/**
 * Edit-view side panel: on a channel, the attributes this channel overrides
 * on the document with the way back to the default values; on Default, a
 * read-only per-channel summary.
 */
export const ChannelOverridesPanel: PanelComponent = ({ documentId, model }) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { current, isOnDefault, others } = useChannels();
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
  const [reset, { isLoading }] = useResetOverridesMutation();
  const [open, setOpen] = React.useState(false);

  if (!enabled || !documentId || others.length === 0) {
    return null;
  }

  const entries = Object.values(overrides ?? {});

  if (isOnDefault) {
    if (entries.length === 0) {
      return null;
    }
    return {
      title: formatMessage({ id: getTranslation('panel.title'), defaultMessage: 'Channels' }),
      content: (
        <Flex direction="column" alignItems="stretch" gap={2}>
          {entries.map((entry) => (
            <Flex key={entry.channel.slug} gap={2} alignItems="center">
              <ChannelDot color={entry.channel.color ?? null} size="8px" />
              <Typography variant="pi" textColor="neutral600">
                {formatMessage(
                  {
                    id: getTranslation('panel.summary'),
                    defaultMessage:
                      '{channel} — {count, plural, one {# field} other {# fields}} overridden',
                  },
                  {
                    channel: entry.channel.name ?? entry.channel.slug,
                    count: entry.attributes.length,
                  }
                )}
              </Typography>
            </Flex>
          ))}
        </Flex>
      ),
    };
  }

  const mine = overrides?.[current.slug];
  if (!mine || mine.attributes.length === 0) {
    return null;
  }

  const handleReset = async () => {
    try {
      await reset({ model, documentId, channel: current.slug, locale }).unwrap();
      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslation('panel.reset.success'),
            defaultMessage: 'Overrides reset — {channel} follows Default again.',
          },
          { channel: current.name }
        ),
      });
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error as Parameters<typeof formatAPIError>[0]),
      });
    }
    setOpen(false);
  };

  return {
    title: formatMessage(
      { id: getTranslation('panel.title.channel'), defaultMessage: 'Overrides — {channel}' },
      { channel: current.name }
    ),
    content: (
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage(
            {
              id: getTranslation('panel.description'),
              defaultMessage: 'Attributes whose value differs from Default on {channel}.',
            },
            { channel: current.name }
          )}
        </Typography>
        <Flex gap={1} wrap="wrap">
          {mine.attributes.map((attribute) => (
            <Badge key={attribute}>{attribute}</Badge>
          ))}
        </Flex>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger>
            <Button variant="danger-light" size="S" fullWidth loading={isLoading}>
              {formatMessage(
                {
                  id: getTranslation('panel.reset'),
                  defaultMessage: 'Reset all overrides for {channel}',
                },
                { channel: current.name }
              )}
            </Button>
          </Dialog.Trigger>
          <ConfirmDialog onConfirm={handleReset}>
            {formatMessage(
              {
                id: getTranslation('panel.reset.confirm'),
                defaultMessage:
                  'Reset every override of this entry on {channel}? It will follow the Default values again.',
              },
              { channel: current.name }
            )}
          </ConfirmDialog>
        </Dialog.Root>
      </Flex>
    ),
  };
};
