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
  overflow: hidden;
  padding-top: 5.6rem;
  display: grid;
  grid-template-columns: 1fr;

  ${({ theme }) => theme.breakpoints.large} {
    padding-top: 0;
    grid-template-columns: ${({ $hasSideNav }) => ($hasSideNav ? `auto 1fr` : '1fr')};
  }
`;

const SideNavMobileTrigger = styled(Flex)`
  position: fixed;
  right: 0;
  top: 0;
  z-index: 1;
  display: block;
  padding: 1.2rem 2.4rem;

  ${({ theme }) => theme.breakpoints.medium} {
    padding: 1.2rem 3.2rem;
  }
  ${({ theme }) => theme.breakpoints.large} {
    display: none;
  }
`;

const SideNavContainer = styled(Flex)<{ $isSideNavMobileVisible: boolean }>`
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 23.2rem;
  z-index: 10;
  background: ${({ theme }) => theme.colors.neutral0};
  box-shadow: ${({ theme }) => theme.shadows.filterShadow};
  transform: ${({ $isSideNavMobileVisible }) =>
    $isSideNavMobileVisible ? 'translateX(0)' : 'translateX(-100%)'};
  transition: transform 0.3s ease-in-out;

  ${({ theme }) => theme.breakpoints.large} {
    position: static;
    height: auto;
    width: auto;
    box-shadow: none;
    transform: none;
  }
`;

const OverflowingItem = styled(Box)<{ $isSideNavMobileVisible: boolean }>`
  overflow-x: hidden;
  transform: ${({ $isSideNavMobileVisible }) =>
    $isSideNavMobileVisible ? 'translateX(23.2rem)' : 'translateX(0)'};
  transition: transform 0.3s ease-in-out;

  ${({ theme }) => theme.breakpoints.large} {
    transform: none;
    width: auto;
  }
`;

const RootLayout = ({ sideNav, children }: LayoutProps) => {
  const [isSideNavMobileVisible, setIsSideNavMobileVisible] = React.useState(false);
  return (
    <GridContainer
      $hasSideNav={Boolean(sideNav)}
      $isSideNavMobileVisible={Boolean(sideNav) && isSideNavMobileVisible}
    >
      {sideNav && (
        <>
          <SideNavMobileTrigger>
            <Button onClick={() => setIsSideNavMobileVisible(!isSideNavMobileVisible)}>
              {isSideNavMobileVisible ? 'Close sidebar' : 'Open sidebar'}
            </Button>
          </SideNavMobileTrigger>
          <SideNavContainer $isSideNavMobileVisible={isSideNavMobileVisible}>
            {sideNav}
          </SideNavContainer>
        </>
      )}
      <OverflowingItem paddingBottom={10} $isSideNavMobileVisible={isSideNavMobileVisible}>
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
