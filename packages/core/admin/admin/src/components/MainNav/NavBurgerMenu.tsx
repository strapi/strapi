import { Box, Flex, ScrollArea } from '@strapi/design-system';
import { styled } from 'styled-components';

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
  top: 5.7rem;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  background-color: ${({ theme }) => theme.colors.neutral0};
  transform: ${({ $isShown }) => ($isShown ? 'translateY(0)' : 'translateY(-100%)')};
  transition: transform 0.2s ease-in-out;

  ${({ theme }) => theme.breakpoints.medium} {
    left: 23.2rem;
  }
  ${({ theme }) => theme.breakpoints.large} {
    display: none;
  }
`;

const NavBurgerMenu = ({ isShown, handleClickOnLink, listLinks }: NavBurgerMenuProps) => {
  return (
    <NavBurgerMenuWrapper
      $isShown={isShown}
      paddingLeft={6}
      paddingRight={6}
      paddingTop={3}
      paddingBottom={6}
    >
      <ScrollArea>
        <ul>
          <MainNavBurgerMenuLinks listLinks={listLinks} handleClickOnLink={handleClickOnLink} />
          <li>
            <NavUser showDisplayName />
          </li>
        </ul>
      </ScrollArea>
    </NavBurgerMenuWrapper>
  );
};

export { NavBurgerMenu };
