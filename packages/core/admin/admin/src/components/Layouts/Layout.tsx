import * as React from 'react';

import { Box, Flex } from '@strapi/design-system';
import { styled } from 'styled-components';

import { ActionLayout } from './ActionLayout';
import { ContentLayout } from './ContentLayout';
import { GridLayout, GridLayoutProps } from './GridLayout';
import { HeaderLayout, BaseHeaderLayout } from './HeaderLayout';

interface LayoutProps {
  children: React.ReactNode;
  sideNav?: React.ReactNode;
}

const GridContainer = styled(Box)<{ $hasSideNav: boolean }>`
  max-width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  overflow: hidden;
  height: calc(100vh - 5.6rem);

  ${({ theme }) => theme.breakpoints.medium} {
    grid-template-columns: ${({ $hasSideNav }) => ($hasSideNav ? `auto 1fr` : '1fr')};
  }
  ${({ theme }) => theme.breakpoints.large} {
    height: 100vh;
  }
`;

const SideNavContainer = styled(Flex)`
  display: none;
  background: ${({ theme }) => theme.colors.neutral0};

  ${({ theme }) => theme.breakpoints.medium} {
    display: block;
    width: 23.2rem;
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

  ${({ theme }) => theme.breakpoints.medium} {
    transform: none;
    width: auto;
  }
`;

const RootLayout = ({ sideNav, children }: LayoutProps) => (
  <GridContainer $hasSideNav={Boolean(sideNav)}>
    {sideNav && (
      <>
        <SideNavContainer>{sideNav}</SideNavContainer>
      </>
    )}
    <OverflowingItem
      paddingBottom={{
        initial: 4,
        medium: 6,
        large: 10,
      }}
    >
      {children}
    </OverflowingItem>
  </GridContainer>
);

const Layouts = {
  Root: RootLayout,
  Header: HeaderLayout,
  BaseHeader: BaseHeaderLayout,
  Grid: GridLayout,
  Action: ActionLayout,
  Content: ContentLayout,
};

export { Layouts, type LayoutProps, type GridLayoutProps };
