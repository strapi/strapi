import * as React from 'react';

import { Box, ScrollArea } from '@strapi/design-system';
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
  z-index: 3;
  background-color: ${({ theme }) => theme.colors.neutral0};
  transform: ${({ $isShown }) => ($isShown ? 'translateY(0)' : 'translateY(-100%)')};
  transition: transform 0.2s ease-in-out;

  ${({ theme }) => theme.breakpoints.medium} {
    &.with-sidenav {
      left: 23.2rem;
    }
  }
  ${({ theme }) => theme.breakpoints.large} {
    display: none;
  }
`;

const NavBurgerMenu = ({ isShown, handleClickOnLink, listLinks }: NavBurgerMenuProps) => {
  const [hasSideNav, setHasSideNav] = React.useState(false);

  const checkSideNav = React.useCallback(() => {
    const sideNavElement = document.querySelector('[data-strapi-sidenav]');
    setHasSideNav(!!sideNavElement);
  }, []);

  React.useEffect(() => {
    const mutationObs = new MutationObserver(checkSideNav);

    // Initial check
    checkSideNav();

    // Observe document for side nav changes
    mutationObs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-strapi-sidenav'],
    });

    return () => {
      mutationObs.disconnect();
    };
  }, [checkSideNav]);

  return (
    <NavBurgerMenuWrapper $isShown={isShown} className={hasSideNav ? 'with-sidenav' : ''}>
      <ScrollArea>
        <Box tag="ul" paddingLeft={6} paddingRight={6} paddingTop={3} paddingBottom={6}>
          <MainNavBurgerMenuLinks listLinks={listLinks} handleClickOnLink={handleClickOnLink} />
          <Box paddingTop={4} tag="li">
            <NavUser closeBurgerMenu={handleClickOnLink} showDisplayName />
          </Box>
        </Box>
      </ScrollArea>
    </NavBurgerMenuWrapper>
  );
};

export { NavBurgerMenu };
