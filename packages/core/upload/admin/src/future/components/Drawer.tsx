import * as React from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import { Box, ScrollArea, IconButton, Flex, FlexProps } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { keyframes, styled } from 'styled-components';

/** Duration of the close animation in ms. Use for timing cleanup (e.g. removing URL params). */
export const DRAWER_CLOSE_ANIMATION_MS = 300;

/* -------------------------------------------------------------------------------------------------
 * Animations
 * -----------------------------------------------------------------------------------------------*/

// Direction: up
const slideUpFromBottomIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideUpFromBottomOut = keyframes`
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(100%);
  }
`;

// Direction: left
const slideLeftFromRightIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideLeftFromRightOut = keyframes`
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
`;

/* -------------------------------------------------------------------------------------------------
 * Styled components
 * -----------------------------------------------------------------------------------------------*/

interface DrawerContainerProps {
  $animationDirection?: DrawerBodyProps['animationDirection'];
  $width?: string;
  $maxHeight?: string;
}

const DrawerContainer = styled(Flex)<DrawerContainerProps>`
  flex-direction: column;
  position: fixed;
  bottom: 0;
  /* Mobile: full-bleed sheet. Anchoring to the right at a fixed width left a
     dead gutter on every phone wider than the panel, and the panel only filled
     the screen once the viewport happened to be narrower than it. Below the
     medium breakpoint the panel is the screen; medium+ restores the
     right-anchored rail. */
  left: 0;
  right: 0;
  width: 100%;
  padding: ${({ theme }) => theme.spaces[2]};
  max-width: 100%;
  /* Sit just below the overlay token (300) so that:
     - popovers (500) and tooltips (1000) rendered from descendant components
       surface above the drawer panel,
     - AlertDialog overlays (300) and contents (310) opened from inside the
       drawer (e.g. the asset details "delete" confirm) cover the drawer. */
  z-index: 200;
  overflow: hidden;
  /* dvh, not vh: anchored to the bottom, a 100vh cap on mobile (visual
     viewport < 100vh under the URL bar) would push the drawer top off-screen. */
  max-height: ${({ $maxHeight }) => $maxHeight ?? '100dvh'};

  ${({ theme }) => theme.breakpoints.medium} {
    left: auto;
    width: ${({ $width }) => $width ?? '400px'};
  }

  &:focus {
    outline: none;
  }

  @media (prefers-reduced-motion: no-preference) {
    &[data-state='open'] {
      animation: ${({ $animationDirection }) =>
          $animationDirection === 'up' ? slideUpFromBottomIn : slideLeftFromRightIn}
        ${DRAWER_CLOSE_ANIMATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
    }

    &[data-state='closed'] {
      animation: ${({ $animationDirection }) =>
          $animationDirection === 'up' ? slideUpFromBottomOut : slideLeftFromRightOut}
        ${DRAWER_CLOSE_ANIMATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
      pointer-events: none;
    }
  }
`;

const DrawerContent = styled(Box)`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  background-color: ${({ theme }) => theme.colors.neutral0};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.popupShadow};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

interface CollapsibleContentProps {
  $isVisible: boolean;
}

const CollapsibleContent = styled(Box)<CollapsibleContentProps>`
  display: grid;
  flex: 1;
  min-height: 0;
  grid-template-rows: ${({ $isVisible }) => ($isVisible ? '1fr' : '0fr')};
  transition: grid-template-rows 0.3s ease-in-out;

  > div {
    overflow: hidden;
    min-height: 0;
  }

  /* The scroll area wraps its children in a div styled inline as
     display: table, min-width: 100%. A table box grows to its content, so a
     single unbreakable string (a long file name) widens it past the scrollport
     and the panel gains a horizontal scrollbar — with nothing left to clamp the
     row, the name never truncates. Overriding to a block box makes the
     scrollport the width again, which is what the vertical-only list wants.
     Inline styles, hence the important. */
  [data-radix-scroll-area-viewport] > div {
    display: block !important;
  }
`;

const CloseIconButton = styled(IconButton)`
  &:hover {
    background: transparent;
  }
`;

/* -------------------------------------------------------------------------------------------------
 * Drawer.Body
 * -----------------------------------------------------------------------------------------------*/

type PointerDownOutsideHandler = NonNullable<Dialog.DialogContentProps['onPointerDownOutside']>;

/** Vetoes an outside interaction that would otherwise dismiss the drawer. */
const keepOpen = (event: { preventDefault: () => void }) => event.preventDefault();

interface DrawerBodyProps extends Omit<FlexProps, 'width' | 'maxHeight'> {
  animationDirection?: 'up' | 'left';
  /** Width of the panel from the medium breakpoint up. Mobile is always full-bleed. */
  width?: string;
  /** Cap on the panel height. Defaults to the dynamic viewport height. */
  maxHeight?: string;
  /**
   * Opt in to dismiss-on-outside-click. Omitted, an outside pointer press never
   * closes the drawer — it must be closed explicitly, as long-running panels
   * like the upload progress dialog need. Passed, the handler can still veto
   * individual presses via `event.preventDefault()`. Content rendered from
   * inside the panel but portaled elsewhere (DS dialogs, popovers, tooltips)
   * never counts as outside — Radix reads the React tree, not the DOM.
   */
  onPointerDownOutside?: PointerDownOutsideHandler;
  children: React.ReactNode;
}

const DrawerBody = React.forwardRef<HTMLDivElement, DrawerBodyProps>(
  (
    { animationDirection, width, maxHeight, onPointerDownOutside = keepOpen, children, ...props },
    ref
  ) => (
    <Dialog.Content
      ref={ref}
      forceMount
      asChild
      onPointerDownOutside={onPointerDownOutside}
      // Non-modal, so focus legitimately moves outside (tabbing past the last
      // field); only a pointer press should ever dismiss.
      onFocusOutside={keepOpen}
      data-animation-direction={animationDirection}
    >
      {/* width/maxHeight go through transient props so the DS Flex never emits a
          competing `width` rule that would outrank the mobile full-bleed one. */}
      <DrawerContainer
        $animationDirection={animationDirection}
        $width={width}
        $maxHeight={maxHeight}
        {...props}
      >
        <DrawerContent>{children}</DrawerContent>
      </DrawerContainer>
    </Dialog.Content>
  )
);
DrawerBody.displayName = 'DrawerBody';

/* -------------------------------------------------------------------------------------------------
 * Drawer.Root
 * -----------------------------------------------------------------------------------------------*/

interface DrawerRootProps {
  isVisible?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

const DrawerRoot = ({ isVisible, onClose, children }: DrawerRootProps): React.ReactElement => (
  <Dialog.Root
    open={isVisible}
    onOpenChange={(nextVisible) => !nextVisible && onClose?.()}
    modal={false}
  >
    <Dialog.Portal>{children}</Dialog.Portal>
  </Dialog.Root>
);

/* -------------------------------------------------------------------------------------------------
 * Drawer.Content - composable content slot (collapsible when isContentExpanded is used)
 * Contains a scrollable area
 * -----------------------------------------------------------------------------------------------*/

interface DrawerScrollableContentProps {
  children: React.ReactNode;
  /** When provided, content can collapse/expand (e.g. for minimize). Omit to always show. */
  isContentExpanded?: boolean;
}

const DrawerScrollableContent = ({
  children,
  isContentExpanded = true,
}: DrawerScrollableContentProps) => (
  <CollapsibleContent $isVisible={isContentExpanded} data-collapsed={!isContentExpanded}>
    <ScrollArea>{children}</ScrollArea>
  </CollapsibleContent>
);

/* -------------------------------------------------------------------------------------------------
 * Drawer.CloseButton - composable close icon button (Cross icon by default)
 * -----------------------------------------------------------------------------------------------*/

interface DrawerCloseButtonProps extends React.PropsWithChildren {
  onClose: () => void;
  label?: string;
}

const DrawerCloseButton = ({ onClose, label, children }: DrawerCloseButtonProps) => {
  const { formatMessage } = useIntl();
  const labelMessage = label ?? formatMessage({ id: 'global.close', defaultMessage: 'Close' });
  return (
    <CloseIconButton onClick={onClose} label={labelMessage} variant="ghost">
      {children ?? <Cross />}
    </CloseIconButton>
  );
};

const Drawer = {
  Root: DrawerRoot,
  Body: DrawerBody,
  ScrollableContent: DrawerScrollableContent,
  CloseButton: DrawerCloseButton,
  Title: Dialog.Title,
  Description: Dialog.Description,
};

export { Drawer };
