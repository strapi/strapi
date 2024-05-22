import * as React from 'react';

import { Box } from '@strapi/design-system';
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
  display: grid;
  grid-template-columns: ${({ $hasSideNav }) => ($hasSideNav ? `auto 1fr` : '1fr')};
`;

const OverflowingItem = styled(Box)`
  overflow-x: hidden;
`;

const RootLayout = ({ sideNav, children }: LayoutProps) => {
  return (
    <GridContainer $hasSideNav={Boolean(sideNav)}>
      {sideNav}
      <OverflowingItem paddingBottom={10}>{children}</OverflowingItem>
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
