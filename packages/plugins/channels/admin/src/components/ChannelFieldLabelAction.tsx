/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import {
  ConfirmDialog,
  useAPIErrorHandler,
  useNotification,
  useQueryParams,
} from '@strapi/admin/strapi-admin';
import { unstable_useContentManagerContext as useContentManagerContext } from '@strapi/content-manager/strapi-admin';
import {
  Button,
  Dialog,
  Flex,
  Popover,
  Tooltip,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Stack } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetEntryOverridesQuery, useResetOverridesMutation } from '../services/channels';
import { getTranslation } from '../utils/getTranslation';

import { useChannels } from './useChannels';

/** i18n's `LabelAction` sizing, shared by every channel label action. */
const IconSpan = styled(Flex)<{ $accent?: boolean }>`
  svg {
    width: 12px;
    height: 12px;

    fill: ${({ theme, $accent }) => ($accent ? theme.colors.primary600 : theme.colors.neutral500)};

    path {
      fill: ${({ theme, $accent }) =>
        $accent ? theme.colors.primary600 : theme.colors.neutral500};
    }
  }
`;

const PlainBadge = ({ title, accent = false }: { title: string; accent?: boolean }) => (
  <IconSpan tag="span" $accent={accent}>
    <VisuallyHidden tag="span">{title}</VisuallyHidden>
    <Tooltip label={title}>
      <Stack aria-hidden focusable={false} />
    </Tooltip>
  </IconSpan>
);

/** "Same on every channel" — non-overridable field, shown on a channel. */
export const SameOnAllChannels = () => {
  const { formatMessage } = useIntl();
  return (
    <PlainBadge
      title={formatMessage({
        id: getTranslation('field.same-on-all'),
        defaultMessage: 'Same value on every channel — edit it on Default',
      })}
    />
  );
};

/**
 * Per-field badge on channel-overridable fields:
 *   - on a channel, field not overridden → muted icon ("editing creates an
 *     override");
 *   - on a channel, field overridden → accent icon opening a popover with the
 *     way back to the default value;
 *   - on Default → muted icon listing the channels that override the field.
 */
const LabelActionInner = ({ fieldName }: { fieldName: string }) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { model, id, isCreatingEntry } = useContentManagerContext();
  const { current, isOnDefault, others } = useChannels();
  const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();
  const locale = query.plugins?.i18n?.locale ?? null;

  // Single types have no route id: degrade to the static badge (the side
  // panel still covers resets there once the CM exposes the documentId).
  const documentId = id && !isCreatingEntry ? id : null;

  const { data: overrides } = useGetEntryOverridesQuery(
    { model, documentId: documentId ?? '', locale },
    { skip: !documentId }
  );
  const [reset, { isLoading }] = useResetOverridesMutation();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const overriddenHere =
    !isOnDefault && !!overrides?.[current.slug]?.attributes.includes(fieldName);
  const overriddenIn = Object.values(overrides ?? {})
    .filter((entry) => entry.attributes.includes(fieldName))
    .map((entry) => entry.channel.name ?? entry.channel.slug);

  if (isOnDefault) {
    return (
      <PlainBadge
        title={
          overriddenIn.length > 0
            ? formatMessage(
                {
                  id: getTranslation('field.overridden-in'),
                  defaultMessage: 'Varies by channel: {channels}',
                },
                { channels: overriddenIn.join(', ') }
              )
            : formatMessage({
                id: getTranslation('field.overridable'),
                defaultMessage: 'Can vary by channel',
              })
        }
      />
    );
  }

  if (!overriddenHere) {
    return (
      <PlainBadge
        title={formatMessage(
          {
            id: getTranslation('field.will-override'),
            defaultMessage: 'Editing this value creates a {channel} override',
          },
          { channel: current.name }
        )}
      />
    );
  }

  const handleReset = async () => {
    if (!documentId) {
      return;
    }
    try {
      await reset({
        model,
        documentId,
        channel: current.slug,
        locale,
        attributes: [fieldName],
      }).unwrap();
      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslation('field.reset.success'),
            defaultMessage: '"{field}" now follows Default again on {channel}.',
          },
          { field: fieldName, channel: current.name }
        ),
      });
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error as Parameters<typeof formatAPIError>[0]),
      });
    }
    setConfirmOpen(false);
  };

  return (
    <Popover.Root>
      <Popover.Trigger>
        <button
          type="button"
          aria-label={formatMessage(
            {
              id: getTranslation('field.overridden'),
              defaultMessage: 'Overridden on {channel}',
            },
            { channel: current.name }
          )}
          style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
        >
          <PlainBadge
            accent
            title={formatMessage(
              {
                id: getTranslation('field.overridden'),
                defaultMessage: 'Overridden on {channel}',
              },
              { channel: current.name }
            )}
          />
        </button>
      </Popover.Trigger>
      <Popover.Content>
        <Flex direction="column" alignItems="stretch" gap={2} padding={4} width="220px">
          <Typography variant="pi" fontWeight="bold">
            {formatMessage(
              {
                id: getTranslation('field.overridden'),
                defaultMessage: 'Overridden on {channel}',
              },
              { channel: current.name }
            )}
          </Typography>
          <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
            <Dialog.Trigger>
              <Button variant="danger-light" size="S" fullWidth loading={isLoading}>
                {formatMessage({
                  id: getTranslation('field.reset'),
                  defaultMessage: 'Reset to default value',
                })}
              </Button>
            </Dialog.Trigger>
            <ConfirmDialog onConfirm={handleReset}>
              {formatMessage(
                {
                  id: getTranslation('field.reset.confirm'),
                  defaultMessage:
                    'Reset "{field}" on {channel}? It will follow the Default value again.',
                },
                { field: fieldName, channel: current.name }
              )}
            </ConfirmDialog>
          </Dialog.Root>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
};

/**
 * The layout waterfall also runs for render paths without the Content Manager
 * context (history, preview): degrade to nothing rather than crash.
 */
class LabelActionBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export const ChannelFieldLabelAction = ({ fieldName }: { fieldName: string }) => (
  <LabelActionBoundary>
    <LabelActionInner fieldName={fieldName} />
  </LabelActionBoundary>
);
