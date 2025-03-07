import { createContext, useContext, useState } from 'react';

import { Box, Flex, IconButton } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { styled, keyframes } from 'styled-components';

export const ANIMATIONS = {
  slideUpIn: keyframes`
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  `,

  slideUpOut: keyframes`
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(10px);
    }
  `,

  slideDownIn: keyframes`
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  `,

  slideDownOut: keyframes`
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-10px);
    }
  `,
};

type PanelSize = 'sm' | 'md' | 'lg';
type PanelPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

interface PanelContextValue {
  size: PanelSize;
  position: PanelPosition;
  isOpen: boolean;
  onToggle: () => void;
}

const PanelContext = createContext<PanelContextValue>({
  size: 'md',
  position: 'bottom-right',
  isOpen: false,
  onToggle: () => {},
});

const PANEL_SIZES: Record<PanelSize, { width: string; height: string }> = {
  sm: { width: '350px', height: '500px' },
  md: { width: '480px', height: '600px' },
  lg: { width: '600px', height: '700px' },
};

const PANEL_POSITIONS: Record<PanelPosition, { [key: string]: number }> = {
  'bottom-right': { bottom: 4, right: 4 },
  'bottom-left': { bottom: 4, left: 4 },
  'top-right': { top: 4, right: 4 },
  'top-left': { top: 4, left: 4 },
};

interface RootProps {
  children: React.ReactNode;
  size?: PanelSize;
  position?: PanelPosition;
  isOpen?: boolean;
  onToggle?: () => void;
  toggleIcon?: React.ReactNode;
}

const FixedWrapper = styled(Box)<{ $position: PanelPosition }>`
  position: fixed;
  display: flex;
  flex-direction: column;
  z-index: 10;
  align-items: ${({ $position }) => ($position.includes('right') ? 'flex-end' : 'flex-start')};
  ${({ $position, theme }) =>
    Object.entries(PANEL_POSITIONS[$position]).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: theme.spaces[value],
      }),
      {}
    )}
`;

const PanelContainer = styled(Box)<{ $size: PanelSize; $position: PanelPosition }>`
  width: ${({ $size }) => PANEL_SIZES[$size].width};
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  height: ${({ $size }) => PANEL_SIZES[$size].height};

  @media (prefers-reduced-motion: no-preference) {
    animation-duration: 200ms;
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);

    &[data-state='open'] {
      animation-name: ${({ $position }) =>
        $position.startsWith('top') ? ANIMATIONS.slideDownIn : ANIMATIONS.slideUpIn};
    }

    &[data-state='closed'] {
      animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
      animation-name: ${({ $position }) =>
        $position.startsWith('top') ? ANIMATIONS.slideDownOut : ANIMATIONS.slideUpOut};
    }
  }
`;

const Root = ({
  children,
  size = 'md',
  position = 'bottom-right',
  isOpen = false,
  onToggle = () => {},
  toggleIcon,
}: RootProps) => {
  return (
    <PanelContext.Provider value={{ size, position, isOpen, onToggle }}>
      <FixedWrapper $position={position}>
        {isOpen ? (
          <PanelContainer
            $size={size}
            $position={position}
            background="neutral0"
            shadow="filterShadow"
            hasRadius
            borderColor="neutral200"
            borderStyle="solid"
            borderWidth="1px"
            data-state={isOpen ? 'open' : 'closed'}
          >
            {children}
          </PanelContainer>
        ) : null}
        {toggleIcon && !isOpen && (
          <IconButton onClick={onToggle} label="Toggle panel" variant="default">
            {toggleIcon}
          </IconButton>
        )}
      </FixedWrapper>
    </PanelContext.Provider>
  );
};

const Header = ({ children }: { children: React.ReactNode }) => (
  <Box padding={[2, 4]} borderColor="neutral150" borderStyle="solid" borderWidth="0 0 1px 0">
    <Flex justifyContent="space-between" alignItems="center">
      {children}
    </Flex>
  </Box>
);

const Body = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box padding={4} flex="1" overflow="auto">
      {children}
    </Box>
  );
};

const Footer = ({ children }: { children: React.ReactNode }) => <Box padding={4}>{children}</Box>;

const Close = () => {
  const { onToggle } = usePanel();

  return (
    <IconButton onClick={onToggle} variant="ghost" label="Close panel">
      <Cross />
    </IconButton>
  );
};

export const Panel = {
  Root,
  Header,
  Body,
  Footer,
  Close,
};

export const usePanel = () => useContext(PanelContext);
