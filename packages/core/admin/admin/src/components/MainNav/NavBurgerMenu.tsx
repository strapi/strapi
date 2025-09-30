import * as React from 'react';

import { Box, ScrollArea } from '@strapi/design-system';
import { styled } from 'styled-components';

import { HEIGHT_TOP_NAVIGATION } from '../../constants/theme';
import { MenuItem } from '../../core/apis/router';

import { MainNavBurgerMenuLinks } from './MainNavLinks';
import { NavUser } from './NavUser';

interface NavBurgerMenuProps {
  isShown: boolean;
  listLinks: MenuItem[];
  handleClickOnLink: (value: string) => void;
  mobile?: boolean;
}

const NavBurgerMenuWrapper = styled(Box)<{ $isShown: boolean }>`
  position: fixed;
  top: calc(${HEIGHT_TOP_NAVIGATION} + 1px);
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  background-color: ${({ theme }) => theme.colors.neutral0};
  transform: ${({ $isShown }) => ($isShown ? 'translateY(0)' : 'translateY(-100%)')};
  transition: transform 0.2s ease-in-out;

  ${({ theme }) => theme.breakpoints.large} {
    display: none;
  }
`;

const NavBurgerMenu = ({ isShown, handleClickOnLink, listLinks }: NavBurgerMenuProps) => (
  <NavBurgerMenuWrapper $isShown={isShown}>
    <ScrollArea>
      <Box tag="ul" paddingLeft={6} paddingRight={6} paddingTop={3} paddingBottom={6}>
        <MainNavBurgerMenuLinks listLinks={listLinks} handleClickOnLink={handleClickOnLink} />
        <Box paddingTop={4} tag="li">
          <NavUser showDisplayName />
        </Box>
      </Box>
    </ScrollArea>
  </NavBurgerMenuWrapper>
);

export { NavBurgerMenu };
