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
}

const DrawerContainer = styled(Flex)<DrawerContainerProps>`
  flex-direction: column;
  position: fixed;
  bottom: 0;
  right: 0;
  padding: ${({ theme }) => theme.spaces[2]};
  max-width: 100%;
  z-index: 1000;
  overflow: hidden;
  width: ${({ width }) => width ?? '400px'};
  max-height: ${({ maxHeight }) => maxHeight ?? '100vh'};

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
    overflow: ${({ $isVisible }) => ($isVisible ? 'auto' : 'hidden')};
    min-height: 0;
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

interface DrawerBodyProps extends FlexProps {
  animationDirection?: 'up' | 'left';
  children: React.ReactNode;
}

const DrawerBody = React.forwardRef<HTMLDivElement, DrawerBodyProps>(
  ({ animationDirection, children, ...props }, ref) => (
    <Dialog.Content
      ref={ref}
      forceMount
      asChild
      onPointerDownOutside={(e) => e.preventDefault()}
      onInteractOutside={(e) => e.preventDefault()}
      data-animation-direction={animationDirection}
    >
      <DrawerContainer $animationDirection={animationDirection} {...props}>
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
