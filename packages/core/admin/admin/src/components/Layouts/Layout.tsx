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
}

const GridContainer = styled(Box)<{ $hasSideNav: boolean; $isSideNavMobileVisible: boolean }>`
  max-width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  overflow: hidden;
  height: 100vh;

  ${({ theme }) => theme.breakpoints.medium} {
    grid-template-columns: ${({ $hasSideNav }) => ($hasSideNav ? `auto 1fr` : '1fr')};
  }
`;

const SideNavContainer = styled(Flex)<{ $isSideNavMobileVisible: boolean }>`
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  z-index: 3;
  background: ${({ theme }) => theme.colors.neutral0};
  transform: ${({ $isSideNavMobileVisible }) =>
    $isSideNavMobileVisible ? 'translateX(0)' : 'translateX(-100%)'};
  transition: transform 0.3s ease-in-out;
  ${({ theme }) => theme.breakpoints.medium} {
    width: 23.2rem;
    top: 5.6rem;
    height: calc(100vh - 5.6rem);
    position: sticky;
    box-shadow: none;
    transform: none;
    border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
  }
  ${({ theme }) => theme.breakpoints.large} {
    height: 100vh;
    top: 0;
    border-top: none;
  }
`;

const OverflowingItem = styled(Box)`
  overflow-x: hidden;
  padding-top: 5.6rem;

  ${({ theme }) => theme.breakpoints.medium} {
    transform: none;
    width: auto;
  }
  ${({ theme }) => theme.breakpoints.large} {
    padding-top: 0;
  }
`;

const RootLayout = ({ sideNav, children }: LayoutProps) => {
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
        </>
      )}
      <OverflowingItem
        paddingBottom={{
          initial: 4,
          medium: 6,
          large: 10,
        }}
      >
        {sideNav && (
          <Box display={{ initial: 'block', medium: 'none' }} padding={4}>
            <Button
              variant="tertiary"
              onClick={() => setIsSideNavMobileVisible(!isSideNavMobileVisible)}
            >
              {isSideNavMobileVisible ? 'Close Side navigation' : 'Open Side navigation'}
            </Button>
          </Box>
        )}
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
