import * as React from 'react';

import { Box, Button, Flex } from '@strapi/design-system';
import { styled } from 'styled-components';

import { ActionLayout } from './ActionLayout';
import { ContentLayout } from './ContentLayout';
import { GridLayout, GridLayoutProps } from './GridLayout';
import { HeaderLayout, BaseHeaderLayout } from './HeaderLayout';

interface LayoutProps {
  children: React.ReactNode;
  sideNav?: React.ReactNode;
  sideNavLabel?: string;
}

const GridContainer = styled(Box)<{ $hasSideNav: boolean; $isSideNavMobileVisible: boolean }>`
  max-width: 100%;
  display: grid;
  grid-template-columns: 1fr;

  ${({ theme }) => theme.breakpoints.medium} {
    grid-template-columns: ${({ $hasSideNav }) => ($hasSideNav ? `auto 1fr` : '1fr')};
  }
`;

const SideNavContainer = styled(Flex)<{ $isSideNavMobileVisible: boolean }>`
  display: block;
  position: fixed;
  top: 5.6rem;
  left: 0;
  height: 100vh;
  width: 100vw;
  z-index: 10;
  background: ${({ theme }) => theme.colors.neutral0};
  box-shadow: ${({ theme }) => theme.shadows.filterShadow};
  transform: ${({ $isSideNavMobileVisible }) =>
    $isSideNavMobileVisible ? 'translateX(0)' : 'translateX(-100%)'};
  transition: transform 0.3s ease-in-out;
  z-index: 1;

  ${({ theme }) => theme.breakpoints.medium} {
    position: sticky;
    top: 0;
    width: auto;
    box-shadow: none;
    transform: none;
    border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
  }
  ${({ theme }) => theme.breakpoints.large} {
    border-top: none;
  }
`;

const OverflowingItem = styled(Box)<{ $isSideNavMobileVisible: boolean }>`
  overflow-x: hidden;

  ${({ theme }) => theme.breakpoints.medium} {
    transform: none;
    width: auto;
  }
`;

const RootLayout = ({ sideNav, sideNavLabel, children }: LayoutProps) => {
  const [isSideNavMobileVisible, setIsSideNavMobileVisible] = React.useState(false);

  React.useEffect(() => {
    const handleCloseMobileNavigation = () => {
      setIsSideNavMobileVisible(false);
    };

    window.addEventListener('closeMobileNavigation', handleCloseMobileNavigation);

    return () => {
      window.removeEventListener('closeMobileNavigation', handleCloseMobileNavigation);
    };
  }, []);

  return (
    <GridContainer
      $hasSideNav={Boolean(sideNav)}
      $isSideNavMobileVisible={Boolean(sideNav) && isSideNavMobileVisible}
    >
      {sideNav && (
        <>
          <SideNavContainer $isSideNavMobileVisible={isSideNavMobileVisible}>
            {sideNav}
          </SideNavContainer>
          <Box
            display={{
              initial: 'block',
              medium: 'none',
            }}
            padding={{
              initial: 4,
              medium: 6,
              large: 10,
            }}
          >
            <Button
              onClick={() => setIsSideNavMobileVisible(!isSideNavMobileVisible)}
              variant="tertiary"
              width="100%"
            >
              {sideNavLabel ||
                (isSideNavMobileVisible ? 'Close Side navigation' : 'Open Side navigation')}
            </Button>
          </Box>
        </>
      )}
      <OverflowingItem
        paddingBottom={{
          initial: 4,
          medium: 6,
          large: 10,
        }}
        $isSideNavMobileVisible={isSideNavMobileVisible}
      >
        {children}
      </OverflowingItem>
    </GridContainer>
  );
};

const Layouts = {
  Root: RootLayout,
  Header: HeaderLayout,
  BaseHeader: BaseHeaderLayout,
  Grid: GridLayout,
  Action: ActionLayout,
  Content: ContentLayout,
};

export { Layouts, type LayoutProps, type GridLayoutProps };
