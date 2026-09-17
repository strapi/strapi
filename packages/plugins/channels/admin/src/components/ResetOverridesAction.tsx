import { useAPIErrorHandler, useNotification, useQueryParams } from '@strapi/admin/strapi-admin';
import { unstable_useDocumentLayout as useDocumentLayout } from '@strapi/content-manager/strapi-admin';
import { Flex, Typography } from '@strapi/design-system';
import { ArrowClockwise, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useGetEntryOverridesQuery, useResetOverridesMutation } from '../services/channels';
import { getTranslation } from '../utils/getTranslation';

import { useChannels } from './useChannels';

import type { DocumentActionComponent } from '@strapi/content-manager/strapi-admin';

type ChannelsLayoutOptions = { channels?: { enabled?: boolean } };

/**
 * "Reset overrides" entry in the document's ··· menu (the `header` document
 * action position), shown only on a channel that overrides something on this
 * entry. Confirms, then every override of the active channel goes and the
 * entry follows Default again.
 */
export const ResetOverridesAction: DocumentActionComponent = ({ model, documentId }) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { current, isOnDefault } = useChannels();
  const {
    edit: { options },
  } = useDocumentLayout(model);
  const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();
  const locale = query.plugins?.i18n?.locale ?? null;

  const enabled = (options as ChannelsLayoutOptions).channels?.enabled === true;
  const { data: overrides } = useGetEntryOverridesQuery(
    { model, documentId: documentId ?? '', locale },
    { skip: !enabled || !documentId || isOnDefault }
  );
  const [reset, { isLoading }] = useResetOverridesMutation();

  if (!enabled || isOnDefault || !documentId) {
    return null;
  }

  const mine = overrides?.[current.slug];
  if (!mine || mine.attributes.length === 0) {
    return null;
  }

  return {
    label: formatMessage(
      {
        id: getTranslation('action.reset.label'),
        defaultMessage: 'Reset overrides ({channel})',
      },
      { channel: current.name }
    ),
    icon: <ArrowClockwise />,
    position: 'header',
    variant: 'danger',
    dialog: {
      type: 'dialog',
      title: formatMessage({
        id: getTranslation('action.reset.dialog.title'),
        defaultMessage: 'Confirmation',
      }),
      content: (
        <Flex direction="column" gap={2}>
          <WarningCircle width="24px" height="24px" fill="danger600" />
          <Typography tag="p" variant="omega" textAlign="center">
            {formatMessage(
              {
                id: getTranslation('action.reset.dialog.body'),
                defaultMessage:
                  'Reset {count, plural, one {# overridden field} other {# overridden fields}} on {channel}? This entry will follow the Default values again.',
              },
              { channel: current.name, count: mine.attributes.length }
            )}
          </Typography>
        </Flex>
      ),
      loading: isLoading,
      onConfirm: async () => {
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
      },
    },
  };
};
