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
 * The "footer note" treatment: the field renders untouched and fully
 * readable; an invisible layer over the control keeps it read-only, and the
 * caption below — "Same as Default · Override" — carries the affordance.
 * Clicking the link (or the field) unlocks it; saving records the override.
 */
const InvisibleGate = styled.button<{ $top: number; $height: number }>`
  position: absolute;
  top: ${({ $top }) => $top}px;
  height: ${({ $height }) => $height}px;
  right: 0;
  left: 0;
  z-index: 2;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
`;

/** Cursor-following hint shown while hovering a locked control. */
const HoverHint = styled.div`
  position: absolute;
  z-index: 3;
  transform: translate(-50%, -110%);
  pointer-events: none;
  white-space: nowrap;
  background: ${({ theme }) => theme.colors.neutral900};
  color: ${({ theme }) => theme.colors.neutral0};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: 4px 10px;
  font-size: 1.2rem;
  font-weight: 600;
  box-shadow: ${({ theme }) => theme.shadows.filterShadow};
`;

const OverrideLink = styled.button<{ $active: boolean }>`
  border: none;
  background: transparent;
  padding: 0;
  font-size: inherit;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary600};
  text-decoration: ${({ $active }) => ($active ? 'underline' : 'none')};
  cursor: pointer;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
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
  const [cursor, setCursor] = React.useState<{ x: number; y: number } | null>(null);
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

  // The invisible layer only spans the input control (the label above and
  // the caption below stay live): the union of the field's elements after
  // the element holding its <label>, walking a level down when a widget
  // wraps label and control together.
  React.useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!veiled || !wrapper) {
      return undefined;
    }
    const measure = () => {
      const wrapperRect = wrapper.getBoundingClientRect();
      const label = wrapper.querySelector('label');
      let top = Infinity;
      let bottom = -Infinity;

      let container: Element | null = wrapper.firstElementChild;
      for (let depth = 0; label && container && depth < 6; depth += 1) {
        let holder: Element | null = null;
        for (const child of Array.from(container.children)) {
          if (child === label || child.contains(label)) {
            holder = child;
            break;
          }
        }
        if (!holder) {
          break;
        }
        let pastHolder = false;
        for (const child of Array.from(container.children)) {
          if (child === holder) {
            pastHolder = true;
            continue;
          }
          if (!pastHolder) {
            continue;
          }
          const rect = child.getBoundingClientRect();
          if (rect.height === 0) {
            continue;
          }
          top = Math.min(top, rect.top);
          bottom = Math.max(bottom, rect.bottom);
        }
        if (bottom > -Infinity || holder === label) {
          break;
        }
        container = holder;
      }

      if (bottom === -Infinity) {
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

  const unlockLabel = formatMessage(
    {
      id: getTranslation('field.click-to-override'),
      defaultMessage: 'Click to override on {channel}',
    },
    { channel: current.name }
  );

  return (
    <GateWrapper ref={wrapperRef}>
      {children}
      <InvisibleGate
        $top={frame.top}
        $height={frame.height}
        type="button"
        onClick={() => setUnlocked(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setCursor(null);
        }}
        onMouseMove={(event: React.MouseEvent) => {
          const rect = wrapperRef.current?.getBoundingClientRect();
          if (rect) {
            setCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top });
          }
        }}
        aria-label={unlockLabel}
      />
      {hovered && cursor ? (
        <HoverHint style={{ left: cursor.x, top: cursor.y - 6 }} aria-hidden>
          {formatMessage({
            id: getTranslation('field.click-to-override.short'),
            defaultMessage: 'Click to override',
          })}
        </HoverHint>
      ) : null}
      <Typography variant="pi" textColor="neutral600">
        {formatMessage({
          id: getTranslation('field.same-as-default'),
          defaultMessage: 'Same as Default',
        })}
        {' · '}
        <OverrideLink
          type="button"
          $active={hovered}
          onClick={() => setUnlocked(true)}
          aria-label={unlockLabel}
        >
          {formatMessage({ id: getTranslation('field.override'), defaultMessage: 'Override' })}
        </OverrideLink>
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
 * keeps the overridable fields a channel has not touched yet behind the
 * footer-note gate. Anything else renders as-is.
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
