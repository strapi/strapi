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
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

/**
 * The "inherited ghost" treatment: the input control sits behind a dashed
 * frame with a light page-colored scrim — dimmed but readable, nothing
 * covered by chrome. Hovering (or focusing) the frame turns it primary,
 * lifts most of the scrim and reveals an inline "Override" affordance; one
 * click makes the field editable, and saving records the override. The
 * measured `$top` offset keeps the field label out of the ghost zone.
 */
const GhostFrame = styled.button<{ $top: number; $height: number }>`
  position: absolute;
  top: ${({ $top }) => $top}px;
  height: ${({ $height }) => $height}px;
  right: 0;
  left: 0;
  z-index: 2;
  border: 1px dashed ${({ theme }) => theme.colors.neutral500};
  border-radius: ${({ theme }) => theme.borderRadius};
  /* Paints a page-colored ring just inside the dashes, hiding the control's
   * own border so the ghost reads as dashed-only, never a double line. */
  box-shadow: inset 0 0 0 2px ${({ theme }) => theme.colors.neutral0};
  background: transparent;
  cursor: pointer;
  padding: 0;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ theme }) => theme.colors.neutral0};
    opacity: 0.45;
  }

  &:hover,
  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.primary600};

    &::before {
      opacity: 0.2;
    }
  }
`;

const OverrideHint = styled.span`
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  font-size: 1.2rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary600};
  background: ${({ theme }) => theme.colors.neutral0};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: 2px 8px;
  opacity: 0;

  ${GhostFrame}:hover &,
  ${GhostFrame}:focus-visible & {
    opacity: 1;
  }
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
  const [hovered, setHovered] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [frame, setFrame] = React.useState({ top: 0, height: 0 });

  const veiled =
    !isOnDefault &&
    !unavailable &&
    layoutChannels?.enabled === true &&
    !isCreatingEntry &&
    documentId !== null &&
    overrides !== undefined &&
    !overrides[current.slug]?.attributes.includes(field.name) &&
    !unlocked;

  // The ghost frame hugs the input CONTROL exactly: the union of the field's
  // elements after its label (so the label stays clear above and the caption
  // below never falls inside the dashes), kept fresh as the control resizes.
  React.useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!veiled || !wrapper) {
      return undefined;
    }
    const measure = () => {
      const wrapperRect = wrapper.getBoundingClientRect();
      const label = wrapper.querySelector('label');
      const container = label?.parentElement;
      let top = Infinity;
      let bottom = -Infinity;
      if (container) {
        let pastLabel = false;
        for (const child of Array.from(container.children)) {
          if (child === label) {
            pastLabel = true;
            continue;
          }
          if (!pastLabel) {
            continue;
          }
          const rect = child.getBoundingClientRect();
          if (rect.height === 0) {
            continue;
          }
          top = Math.min(top, rect.top);
          bottom = Math.max(bottom, rect.bottom);
        }
      }
      if (bottom === -Infinity) {
        // No label to anchor on: frame the whole rendered input.
        top = wrapperRect.top;
        bottom = wrapperRect.bottom;
      }
      setFrame({
        top: Math.max(0, top - wrapperRect.top),
        height: Math.max(0, bottom - top),
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [veiled]);

  if (!veiled) {
    return <>{children}</>;
  }

  return (
    <GateWrapper ref={wrapperRef}>
      {children}
      <GhostFrame
        $top={frame.top}
        $height={frame.height}
        type="button"
        onClick={() => setUnlocked(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label={formatMessage(
          {
            id: getTranslation('field.click-to-override'),
            defaultMessage: 'Click to override on {channel}',
          },
          { channel: current.name }
        )}
      >
        <OverrideHint>
          {formatMessage({ id: getTranslation('field.override'), defaultMessage: 'Override' })}
        </OverrideHint>
      </GhostFrame>
      <Typography variant="pi" textColor={hovered ? 'primary600' : 'neutral600'}>
        {hovered
          ? formatMessage(
              {
                id: getTranslation('field.click-to-override'),
                defaultMessage: 'Click to override on {channel}',
              },
              { channel: current.name }
            )
          : formatMessage({
              id: getTranslation('field.inherited'),
              defaultMessage: 'Inherited from Default',
            })}
      </Typography>
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
 * ghosts the overridable fields a channel has not touched yet. Anything
 * else renders as-is.
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
