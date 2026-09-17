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

/** i18n's `LabelAction` sizing for the icon-only states. */
const IconSpan = styled(Flex)`
  svg {
    width: 12px;
    height: 12px;

    fill: ${({ theme }) => theme.colors.neutral500};

    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }
`;

const PlainBadge = ({ title }: { title: string }) => (
  <IconSpan tag="span">
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

const OverriddenChip = styled.button`
  /* Field.Root is an alignItems: stretch column, so the label flex spans the
   * field's full width: auto margin sends the chip to the input's right edge,
   * on the label's line. */
  margin-left: auto;
  border: none;
  background: ${({ theme }) => theme.colors.primary100};
  color: ${({ theme }) => theme.colors.primary600};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: 0 ${({ theme }) => theme.spaces[1]};
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.6rem;
  cursor: default;
`;

/**
 * The overridden state: a small "Overridden" text chip; hovering it opens a
 * popover with the details and the way back to the Default value. The popover
 * stays open while the cursor is inside it.
 */
const OverriddenBadge = ({
  fieldName,
  channelName,
  onReset,
  isResetting,
}: {
  fieldName: string;
  channelName: string;
  onReset: () => Promise<void>;
  isResetting: boolean;
}) => {
  const { formatMessage } = useIntl();
  const [open, setOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout>>();

  const show = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
    setOpen(true);
  };
  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  React.useEffect(() => () => closeTimer.current && clearTimeout(closeTimer.current), []);

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger>
          {/* Mouse-only: focus handlers would loop with the popover's focus
              stealing (open → content steals focus → blur → close → focus
              restored → open again). */}
          <OverriddenChip type="button" onMouseEnter={show} onMouseLeave={hide}>
            {formatMessage({
              id: getTranslation('field.overridden.chip'),
              defaultMessage: 'Overridden',
            })}
          </OverriddenChip>
        </Popover.Trigger>
        <Popover.Content sideOffset={4} onMouseEnter={show} onMouseLeave={hide}>
          <Flex direction="column" alignItems="stretch" gap={2} padding={4} width="240px">
            <Typography variant="pi" fontWeight="bold">
              {formatMessage(
                {
                  id: getTranslation('field.overridden'),
                  defaultMessage: 'Overridden on {channel}',
                },
                { channel: channelName }
              )}
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage(
                {
                  id: getTranslation('field.overridden.details'),
                  defaultMessage:
                    '"{field}" carries its own value on {channel}. The Default content is untouched.',
                },
                { field: fieldName, channel: channelName }
              )}
            </Typography>
            <Button
              variant="danger-light"
              size="S"
              fullWidth
              loading={isResetting}
              onClick={() => {
                setOpen(false);
                setConfirmOpen(true);
              }}
            >
              {formatMessage({
                id: getTranslation('field.reset'),
                defaultMessage: 'Reset to default value',
              })}
            </Button>
          </Flex>
        </Popover.Content>
      </Popover.Root>
      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <ConfirmDialog
          onConfirm={async () => {
            await onReset();
            setConfirmOpen(false);
          }}
        >
          {formatMessage(
            {
              id: getTranslation('field.reset.confirm'),
              defaultMessage:
                'Reset "{field}" on {channel}? It will follow the Default value again.',
            },
            { field: fieldName, channel: channelName }
          )}
        </ConfirmDialog>
      </Dialog.Root>
    </>
  );
};

/**
 * Per-field badge on channel-overridable fields:
 *   - on a channel, field not overridden → muted icon ("editing creates an
 *     override");
 *   - on a channel, field overridden → an "Overridden" text chip whose hover
 *     popover carries the details and the per-field reset;
 *   - on Default → muted icon listing the channels that override the field.
 */
const LabelActionInner = ({ fieldName }: { fieldName: string }) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { model, id, isCreatingEntry } = useContentManagerContext();
  const { current, isOnDefault } = useChannels();
  const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();
  const locale = query.plugins?.i18n?.locale ?? null;

  // Single types have no route id: degrade to the static badge.
  const documentId = id && !isCreatingEntry ? id : null;

  const { data: overrides } = useGetEntryOverridesQuery(
    { model, documentId: documentId ?? '', locale },
    { skip: !documentId }
  );
  const [reset, { isLoading }] = useResetOverridesMutation();

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
  };

  return (
    <OverriddenBadge
      fieldName={fieldName}
      channelName={current.name}
      onReset={handleReset}
      isResetting={isLoading}
    />
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
