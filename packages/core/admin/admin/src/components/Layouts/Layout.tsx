import * as React from 'react';

import { Box, Flex } from '@strapi/design-system';
import { styled } from 'styled-components';

import { RESPONSIVE_DEFAULT_SPACING } from '../../constants/theme';

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
  padding: 0;

  ${({ theme }) => theme.breakpoints.medium} {
    grid-template-columns: ${({ $hasSideNav }) => ($hasSideNav ? `auto 1fr` : '1fr')};
  }
`;

const SideNavContainer = styled(Flex)`
  display: none;
  background: ${({ theme }) => theme.colors.neutral0};

  ${({ theme }) => theme.breakpoints.medium} {
    display: block;
    box-shadow: none;
    transform: none;
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
    {sideNav && <SideNavContainer>{sideNav}</SideNavContainer>}
    <OverflowingItem paddingBottom={RESPONSIVE_DEFAULT_SPACING} data-strapi-main-content>
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
