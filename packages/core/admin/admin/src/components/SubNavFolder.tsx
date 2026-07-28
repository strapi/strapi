import { useCallback, useId, useRef, useState } from 'react';

import { Box, Flex, Tooltip, Typography } from '@strapi/design-system';
import { ChevronDown } from '@strapi/icons';
import { styled } from 'styled-components';

export const BASE_INDENT = 12;
export const INDENT_STEP = 24;

const ANIMATION_DURATION = '0.5s';
const COLLAPSE_EASING = 'cubic-bezier(0, 1, 0, 1)';

interface SubNavFolderProps {
  label: string;
  depth?: number;
  /** Controlled open state. When provided the folder keeps no internal state. */
  open?: boolean;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
  /** Trailing actions slot (e.g. a "…" menu), revealed on row hover/focus. */
  endAction?: React.ReactNode;
  children?: React.ReactNode;
}

const FolderRow = styled(Flex)<{ $depth: number }>`
  border-radius: ${({ theme }) => theme.borderRadius};

  padding-left: ${({ $depth }) => `${BASE_INDENT + $depth * INDENT_STEP}px`};
  padding-right: ${({ theme }) => theme.spaces[3]};

  &:hover {
    background-color: ${({ theme }) => theme.colors.neutral100};
  }
`;

const ToggleButton = styled.button`
  gap: ${({ theme }) => theme.spaces[2]};
  align-items: center;
  display: flex;
  flex: 1;

  padding-block: ${({ theme }) => theme.spaces[2]};
  padding-inline: 0;

  min-width: 0;

  background: transparent;
  border: none;

  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline-offset: -2px;
  }
`;

const EndActionWrapper = styled(Flex)`
  flex-shrink: 0;

  visibility: hidden;
  opacity: 0;

  ${FolderRow}:hover &,
  ${FolderRow}:focus-within & {
    visibility: visible;
    opacity: 1;
  }
`;

const Collapsible = styled.div<{ $open: boolean }>`
  grid-template-rows: ${({ $open }) => ($open ? '1fr' : '0fr')};
  display: grid;

  transition: grid-template-rows ${ANIMATION_DURATION} ${COLLAPSE_EASING};
`;

const CollapsibleInner = styled.div`
  overflow: hidden;
  min-height: 0;
`;

interface FolderViewProps {
  endAction?: React.ReactNode;
  children?: React.ReactNode;
  onToggleClick: () => void;
  label: string;
  depth: number;
  open: boolean;
}

const FolderView = ({
  onToggleClick,
  endAction,
  children,
  label,
  depth,
  open,
}: FolderViewProps) => {
  const listId = useId();

  const [isLabelTruncated, setIsLabelTruncated] = useState(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // A callback ref (rather than useRef + useEffect) so measurement survives the label
  // element remounting when it moves in and out of the Tooltip wrapper below.
  const measureLabelRef = useCallback((node: HTMLElement | null) => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (!node) {
      return;
    }

    const measure = () => {
      setIsLabelTruncated(node.scrollWidth > node.clientWidth);
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    resizeObserverRef.current = new ResizeObserver(measure);
    resizeObserverRef.current.observe(node);
  }, []);

  const labelTypography = (
    <Typography
      textColor="neutral800"
      fontWeight="semiBold"
      ref={measureLabelRef}
      overflow="hidden"
      tag="span"
      style={{ flex: 1, minWidth: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
    >
      {label}
    </Typography>
  );

  return (
    <Box>
      <FolderRow $depth={depth} alignItems="center">
        <ToggleButton
          onClick={onToggleClick}
          aria-controls={listId}
          aria-expanded={open}
          type="button"
        >
          <ChevronDown
            fill="neutral500"
            aria-hidden
            style={{
              transform: `rotate(${open ? '0deg' : '-90deg'})`,
              transition: `transform ${ANIMATION_DURATION}`,
              flexShrink: 0,
            }}
          />
          {isLabelTruncated ? <Tooltip label={label}>{labelTypography}</Tooltip> : labelTypography}
        </ToggleButton>
        {endAction != null && (
          <EndActionWrapper gap={2} alignItems="center">
            {endAction}
          </EndActionWrapper>
        )}
      </FolderRow>
      <Collapsible $open={open} id={listId}>
        <CollapsibleInner>{children}</CollapsibleInner>
      </Collapsible>
    </Box>
  );
};

const SubNavFolder = ({
  defaultOpen = false,
  open: openProp,
  endAction,
  children,
  onToggle,
  label,
  depth = 0,
}: SubNavFolderProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const handleToggleClick = () => {
    const next = !open;

    if (!isControlled) {
      setUncontrolledOpen(next);
    }

    onToggle?.(next);
  };

  return (
    <FolderView
      onToggleClick={handleToggleClick}
      endAction={endAction}
      label={label}
      depth={depth}
      open={open}
    >
      {children}
    </FolderView>
  );
};

export { SubNavFolder };
export type { SubNavFolderProps };
