import * as React from 'react';

import { Box, VisuallyHidden } from '@strapi/design-system';
import styled from 'styled-components';

const BrandIconWrapper = styled.div`
  svg,
  img {
    border-radius: ${({ theme }) => theme.borderRadius};
    object-fit: contain;
    height: ${24 / 16}rem;
    width: ${24 / 16}rem;
    margin: ${3 / 16}rem;
  }
`;

export interface NavBrandProps {
  icon: React.ReactNode;
  title: string;
  workplace: string;
}

export const NavBrand = ({ workplace, title, icon }: NavBrandProps) => {
  return (
    <Box paddingLeft={3} paddingRight={3} paddingTop={3} paddingBottom={3}>
      <BrandIconWrapper>
        {icon}
        <VisuallyHidden>
          <span>{title}</span>
          <span>{workplace}</span>
        </VisuallyHidden>
      </BrandIconWrapper>
    </Box>
  );
};
