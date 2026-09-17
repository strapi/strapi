import * as React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { unstable_useContentManagerContext as useContentManagerContext } from '@strapi/content-manager/strapi-admin';
import { Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetEntryOverridesQuery } from '../services/channels';
import { getTranslation } from '../utils/getTranslation';

import { useChannels } from './useChannels';

import type { FieldDecoratorProps } from '@strapi/content-manager/strapi-admin';

type ChannelsLayoutOptions = { channels?: { enabled?: boolean; availableIn?: string[] } };

interface ChannelsAttributeOptions {
  overridable?: boolean;
  visibleIn?: string[];
}

const GateWrapper = styled.div`
  position: relative;
`;

/**
 * The inherited-value veil: a 30% dim over the whole field with the Default
 * value readable underneath. One click (or Enter) lifts it and the field
 * becomes editable — saving then records the override.
 */
const Veil = styled.button`
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: ${({ theme }) => theme.borderRadius};
    background: ${({ theme }) => theme.colors.neutral800};
    opacity: 0.3;
  }

  &:hover::before,
  &:focus-visible::before {
    opacity: 0.4;
  }
`;

const VeilLabel = styled(Typography)`
  position: relative;
  background: ${({ theme }) => theme.colors.neutral0};
  color: ${({ theme }) => theme.colors.primary600};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: ${({ theme }) => `${theme.spaces[1]} ${theme.spaces[3]}`};
  box-shadow: ${({ theme }) => theme.shadows.filterShadow};
`;

const GateInner = ({ field, children }: FieldDecoratorProps) => {
  const { formatMessage } = useIntl();
  const { current, isOnDefault } = useChannels();
  const { model, id, isCreatingEntry, layout } = useContentManagerContext();
  const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();
  const locale = query.plugins?.i18n?.locale ?? null;

  const documentId = id && !isCreatingEntry ? id : null;
  const layoutChannels = (layout.edit.options as ChannelsLayoutOptions).channels;
  const availableIn = layoutChannels?.availableIn;
  const unavailable =
    Array.isArray(availableIn) && availableIn.length > 0 && !availableIn.includes(current.slug);

  const { data: overrides } = useGetEntryOverridesQuery(
    { model, documentId: documentId ?? '', locale },
    { skip: !documentId || isOnDefault }
  );
  const [unlocked, setUnlocked] = React.useState(false);

  const veiled =
    !isOnDefault &&
    !unavailable &&
    layoutChannels?.enabled === true &&
    !isCreatingEntry &&
    documentId !== null &&
    overrides !== undefined &&
    !overrides[current.slug]?.attributes.includes(field.name) &&
    !unlocked;

  if (!veiled) {
    return <>{children}</>;
  }

  return (
    <GateWrapper>
      {children}
      <Veil
        type="button"
        onClick={() => setUnlocked(true)}
        aria-label={formatMessage(
          {
            id: getTranslation('field.click-to-override'),
            defaultMessage: 'Click to override on {channel}',
          },
          { channel: current.name }
        )}
      >
        <VeilLabel variant="pi" fontWeight="bold">
          {formatMessage(
            {
              id: getTranslation('field.click-to-override.short'),
              defaultMessage: 'Click to override',
            },
            { channel: current.name }
          )}
        </VeilLabel>
      </Veil>
    </GateWrapper>
  );
};

/**
 * Outside the Content Manager context (history, preview) the gate must
 * degrade to the bare input rather than crash.
 */
class GateBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
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

/**
 * Field decorator (see the Content Manager's `registerFieldDecorator`):
 * lays the inherited-value veil over overridable fields a channel has not
 * touched yet. Anything else renders as-is.
 */
export const ChannelOverrideGate = ({ field, children }: FieldDecoratorProps) => {
  const options = (
    field.attribute as { pluginOptions?: { channels?: ChannelsAttributeOptions } } | undefined
  )?.pluginOptions?.channels;

  if (options?.overridable !== true || field.disabled === true || field.visible === false) {
    return <>{children}</>;
  }

  return (
    <GateBoundary>
      <GateInner field={field}>{children}</GateInner>
    </GateBoundary>
  );
};
