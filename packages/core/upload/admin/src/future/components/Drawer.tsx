import * as React from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import { Box, ScrollArea, IconButton } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { keyframes, styled } from 'styled-components';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

interface DrawerContextValue {
  animationDirection?: 'up' | 'left';
  isVisible?: boolean;
  onClose?: () => void;
  isContentExpanded?: boolean | undefined;
  width?: number | string;
  height?: number | string;
  maxHeight?: number | string;
}

/** Duration of the close animation in ms. Use for timing cleanup (e.g. removing URL params). */
export const DRAWER_CLOSE_ANIMATION_MS = 300;

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

const useDrawerContext = () => {
  const context = React.useContext(DrawerContext);
  if (!context) {
    throw new Error('Drawer compound components must be used within Drawer.Root');
  }
  return context;
};

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
  $width?: number | string;
  $height?: number | string;
  $maxHeight?: number | string;
  $animationDirection?: 'up' | 'left';
}

const DrawerContainer = styled(Dialog.Content)<DrawerContainerProps>`
  display: flex;
  flex-direction: column;
  position: fixed;
  bottom: 0;
  right: 0;
  padding: ${({ theme }) => theme.spaces[2]};
  width: ${({ $width }) => (typeof $width === 'number' ? `${$width}px` : ($width ?? '400px'))};
  height: ${({ $height }) => (typeof $height === 'number' ? `${$height}px` : ($height ?? 'auto'))};
  max-width: 100%;
  max-height: ${({ $maxHeight }) =>
    typeof $maxHeight === 'number' ? `${$maxHeight}px` : ($maxHeight ?? '100vh')};
  z-index: 1000;
  overflow: hidden;

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

interface AnimatedBodyProps {
  $isVisible: boolean;
}

const AnimatedBody = styled(Box)<AnimatedBodyProps>`
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

/* -------------------------------------------------------------------------------------------------
 * Drawer.Root
 * -----------------------------------------------------------------------------------------------*/

const DrawerRoot = ({
  animationDirection = 'up',
  isVisible,
  onClose,
  isContentExpanded,
  width,
  height,
  maxHeight,
  children,
}: DrawerContextValue & React.PropsWithChildren) => {
  const contextValue: DrawerContextValue = {
    animationDirection,
    isVisible,
    onClose,
    isContentExpanded,
    width,
    height,
    maxHeight,
  };

  return (
    <DrawerContext.Provider value={contextValue}>
      <Dialog.Root
        open={isVisible}
        onOpenChange={(nextVisible) => !nextVisible && onClose?.()}
        modal={false}
      >
        <Dialog.Portal>
          <DrawerContainer
            $animationDirection={animationDirection}
            $width={width}
            $height={height}
            $maxHeight={maxHeight}
            forceMount
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DrawerContent>{children}</DrawerContent>
          </DrawerContainer>
        </Dialog.Portal>
      </Dialog.Root>
    </DrawerContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Drawer.Content - composable content slot (collapsible when isContentExpanded is used)
 * Contains a scrollable area
 * -----------------------------------------------------------------------------------------------*/

const DrawerContentSlot = ({ children }: React.PropsWithChildren) => {
  const { isContentExpanded } = useDrawerContext();
  const isCollapsible = typeof isContentExpanded === 'boolean';
  const isContentVisible = isCollapsible ? isContentExpanded : true;

  return (
    <AnimatedBody $isVisible={isContentVisible} data-collapsed={!isContentVisible}>
      <ScrollArea>{children}</ScrollArea>
    </AnimatedBody>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Drawer.CloseButton - composable close icon button (Cross icon by default)
 * -----------------------------------------------------------------------------------------------*/

const CloseIconButton = styled(IconButton)`
  &:hover {
    background: transparent;
  }
`;

export interface DrawerCloseButtonProps extends React.PropsWithChildren {
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
  Content: DrawerContentSlot,
  CloseButton: DrawerCloseButton,
};

export { Drawer };
