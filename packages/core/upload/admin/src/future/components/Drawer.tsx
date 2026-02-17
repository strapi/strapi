import * as React from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import { ScrollArea, Flex, IconButton, Typography } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { keyframes, styled } from 'styled-components';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

interface DrawerContextValue {
  isVisible: boolean;
  onClose: () => void;
  isContentExpanded: boolean | undefined;
  dataTestId?: string;
  width?: number | string;
  height?: number | string;
  maxHeight?: number | string;
}

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

const useDrawerContext = () => {
  const context = React.useContext(DrawerContext);
  if (!context) {
    throw new Error('Drawer compound components must be used within Drawer.Root');
  }
  return context;
};

/* -------------------------------------------------------------------------------------------------
 * Animations - slide up from bottom (outside viewport)
 * -----------------------------------------------------------------------------------------------*/

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

/* -------------------------------------------------------------------------------------------------
 * Styled components
 * -----------------------------------------------------------------------------------------------*/

const DrawerContainer = styled(Dialog.Content)<{
  $width?: number | string;
  $height?: number | string;
  $maxHeight?: number | string;
}>`
  display: flex;
  flex-direction: column;
  position: fixed;
  bottom: 0;
  right: 0;
  padding: ${({ theme }) => theme.spaces[2]};
  width: ${({ $width }) => (typeof $width === 'number' ? `${$width}px` : ($width ?? '400px'))};
  height: ${({ $height }) => (typeof $height === 'number' ? `${$height}px` : ($height ?? 'auto'))};
  max-height: ${({ $maxHeight }) =>
    typeof $maxHeight === 'number' ? `${$maxHeight}px` : ($maxHeight ?? '100vh')};
  z-index: 1000;
  overflow: hidden;

  &:focus {
    outline: none;
  }

  @media (prefers-reduced-motion: no-preference) {
    &[data-state='open'] {
      animation: ${slideUpFromBottomIn} 300ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
    }

    &[data-state='closed'] {
      animation: ${slideUpFromBottomOut} 300ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
      pointer-events: none;
    }
  }
`;

const DrawerContent = styled.div`
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

const AnimatedBody = styled.div<{ $isVisible: boolean }>`
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

export interface DrawerRootProps {
  isVisible: boolean;
  onClose: () => void;
  isContentExpanded?: boolean;
  width?: number | string;
  height?: number | string;
  maxHeight?: number | string;
  dataTestId?: string;
  children: React.ReactNode;
}

const DrawerRoot = ({
  isVisible,
  onClose,
  isContentExpanded,
  width,
  height,
  maxHeight,
  dataTestId,
  children,
}: DrawerRootProps) => {
  const contextValue: DrawerContextValue = {
    isVisible,
    onClose,
    isContentExpanded,
    dataTestId,
    width,
    height,
    maxHeight,
  };

  return (
    <DrawerContext.Provider value={contextValue}>
      <Dialog.Root
        open={isVisible}
        onOpenChange={(nextVisible) => !nextVisible && onClose()}
        modal={false}
      >
        <Dialog.Portal>
          <DrawerContainer
            $width={width}
            $height={height}
            $maxHeight={maxHeight}
            data-testid={dataTestId}
            aria-describedby={undefined}
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
 * Drawer.Header - composable header slot
 * -----------------------------------------------------------------------------------------------*/

const DrawerHeaderSlot = ({ children }: { children?: React.ReactNode }) => {
  if (!children) return null;
  return <>{children}</>;
};

/* -------------------------------------------------------------------------------------------------
 * Drawer.Content - composable content slot (collapsible when isContentExpanded is used)
 * -----------------------------------------------------------------------------------------------*/

const DrawerContentSlot = ({ children }: { children?: React.ReactNode }) => {
  const { isContentExpanded } = useDrawerContext();
  const isCollapsible = typeof isContentExpanded === 'boolean';
  const isContentVisible = isCollapsible ? isContentExpanded : true;

  return (
    <AnimatedBody $isVisible={isContentVisible}>
      <ScrollArea>
        <Flex direction="column" alignItems="stretch" gap={4}>
          {children}
        </Flex>
      </ScrollArea>
    </AnimatedBody>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Drawer.Footer - composable footer slot
 * -----------------------------------------------------------------------------------------------*/

const DrawerFooterSlot = ({ children }: { children?: React.ReactNode }) => {
  if (!children) return null;
  return <>{children}</>;
};

/* -------------------------------------------------------------------------------------------------
 * Drawer.CloseButton - composable close icon button
 * -----------------------------------------------------------------------------------------------*/

const CloseIconButton = styled(IconButton)`
  &:hover {
    background: transparent;
  }
`;

export interface DrawerCloseButtonProps {
  onClose: () => void;
  label?: string;
  children?: React.ReactNode;
}

const DrawerCloseButton = ({ onClose, label = 'Close', children }: DrawerCloseButtonProps) => (
  <CloseIconButton onClick={onClose} label={label} variant="ghost">
    {children ?? <Cross />}
  </CloseIconButton>
);

/* -------------------------------------------------------------------------------------------------
 * Drawer.Header - preset with title, subtitle, actions (for asset details, etc.)
 * -----------------------------------------------------------------------------------------------*/

export interface DrawerHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  background?: 'primary100' | 'success100' | 'danger100' | 'neutral100';
}

const DrawerHeaderPreset = ({
  title,
  subtitle,
  actions,
  background = 'neutral100',
}: DrawerHeaderProps) => (
  <Flex
    background={background}
    justifyContent="space-between"
    margin={1}
    hasRadius
    alignItems="center"
  >
    <Flex direction="column" alignItems="flex-start" paddingLeft={2} minWidth={0}>
      <Dialog.Title>
        <Typography variant="omega">{title}</Typography>
      </Dialog.Title>
      <Dialog.Description>
        {subtitle ? (
          <Typography variant="pi" textColor="neutral600">
            {subtitle}
          </Typography>
        ) : (
          <span />
        )}
      </Dialog.Description>
    </Flex>
    {actions && (
      <Flex gap={1} shrink={0} alignItems="center">
        {actions}
      </Flex>
    )}
  </Flex>
);

/* -------------------------------------------------------------------------------------------------
 * Drawer - compound component
 * -----------------------------------------------------------------------------------------------*/

/**
 * Composable drawer with Root, Header, Content, Footer slots.
 *
 * @example
 * // Upload progress
 * <Drawer.Root isVisible={isVisible} onClose={handleClose} isContentExpanded={!isMinimized}>
 *   <Drawer.Header><DialogHeader /></Drawer.Header>
 *   <Drawer.Content>{fileList}</Drawer.Content>
 *   <Drawer.Footer />
 * </Drawer.Root>
 *
 * @example
 * // Asset details
 * <Drawer.Root isVisible={isOpen} onClose={() => setIsOpen(false)}>
 *   <Drawer.Header>
 *     <Drawer.HeaderPreset title="Asset details" subtitle="image.png" actions={<Drawer.CloseButton onClose={() => setIsOpen(false)} />} />
 *   </Drawer.Header>
 *   <Drawer.Content><AssetDetailsContent /></Drawer.Content>
 * </Drawer.Root>
 */
const Drawer = {
  Root: DrawerRoot,
  Header: DrawerHeaderSlot,
  Content: DrawerContentSlot,
  Footer: DrawerFooterSlot,
  CloseButton: DrawerCloseButton,
  /** Preset header with title, subtitle, actions - use when you need a simple header layout */
  HeaderPreset: DrawerHeaderPreset,
};

export { Drawer };
