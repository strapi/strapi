import * as React from 'react';

import { Box } from '@strapi/design-system';
import { styled } from 'styled-components';

interface GridColSize {
  S: number;
  M: number;
}

const GridColSize = {
  S: 180,
  M: 250,
};

type Size = keyof GridColSize;

const StyledGrid = styled(Box)<{ $size: Size }>`
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(${({ $size }: { $size: Size }) => `${GridColSize[$size]}px`}, 1fr)
  );
  grid-gap: ${({ theme }) => theme.spaces[4]};
`;

interface GridLayoutProps {
  size: Size;
  children: React.ReactNode;
}

const GridLayout = ({ size, children }: GridLayoutProps) => {
  return <StyledGrid $size={size}>{children}</StyledGrid>;
};

export { GridLayout };
export type { GridLayoutProps, GridColSize };
