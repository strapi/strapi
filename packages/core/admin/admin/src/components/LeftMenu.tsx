import * as React from 'react';

import { Box, Divider, Flex, FlexComponent, useCollator } from '@strapi/design-system';
import { Cross, List } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { styled } from 'styled-components';

import { useTracking } from '../features/Tracking';
import { Menu, MenuItem, MobileMenuItem } from '../hooks/useMenu';

import { MainNav } from './MainNav/MainNav';
import { MainNavIcons } from './MainNav/MainNavLinks';
import { NavBrand } from './MainNav/NavBrand';
import { NavBurgerMenu } from './MainNav/NavBurgerMenu';
import { NavUser } from './MainNav/NavUser';
import { TrialCountdown } from './MainNav/TrialCountdown';

const sortLinks = (links: MenuItem[]) => {
  return links.sort((a, b) => {
    // if no position is defined, we put the link in the position of the external plugins, before the plugins list
    const positionA = a.position ?? 6;
    const positionB = b.position ?? 6;

    if (positionA < positionB) {
      return -1;
    } else {
      return 1;
    }
  });
};

const NavListWrapper = styled<FlexComponent<'ul'>>(Flex)`
  width: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

interface LeftMenuProps
  extends Pick<
    Menu,
    'generalSectionLinks' | 'pluginsSectionLinks' | 'topMobileNavigation' | 'burgerMobileNavigation'
  > {}

const MenuDetails = styled(Flex)`
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  overflow-x: auto;

  ${({ theme }) => theme.breakpoints.large} {
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
  }
`;

const LeftMenu = ({
  generalSectionLinks,
  pluginsSectionLinks,
  topMobileNavigation,
  burgerMobileNavigation,
}: LeftMenuProps) => {
  const [isBurgerMenuShown, setIsBurgerMenuShown] = React.useState(false);
  const { trackUsage } = useTracking();
  const { pathname } = useLocation();
  const { formatMessage, locale } = useIntl();
  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const handleClickOnLink = (destination: string) => {
    setIsBurgerMenuShown(false);
    trackUsage('willNavigate', { from: pathname, to: destination });
  };

  const listLinksAlphabeticallySorted = [...pluginsSectionLinks, ...generalSectionLinks].sort(
    (a, b) => formatter.compare(formatMessage(a.intlLabel), formatMessage(b.intlLabel))
  );
  const listLinks = sortLinks(listLinksAlphabeticallySorted);

  /**
   * Return filtered mobile navigation links (used for both top and burger menu)
   */
  const mapMobileNavigationLinks = React.useCallback(
    (mobileNavLinks: MobileMenuItem[]): MenuItem[] =>
      mobileNavLinks
        .map((mobileLink) => {
          const linkFound = listLinks.find((link) => link.to === mobileLink.to);
          if (!linkFound) return null;
          return mobileLink.link ? { ...linkFound, navigationLink: mobileLink.link } : linkFound;
        })
        .filter((link) => link !== null) as MenuItem[],
    [listLinks]
  );

  /**
   * Mobile top navigation
   */
  const topMobileNavigationLinks = mapMobileNavigationLinks(topMobileNavigation);

  /**
   * Mobile burger menu
   */
  const excludedPluginsFromBurgerMenu = [
    'content-manager',
    'content-type-builder',
    'upload',
    'content-releases',
  ];
  const burgerMenuPluginsLinks = pluginsSectionLinks.filter(
    (plugin) => !excludedPluginsFromBurgerMenu.some((link) => plugin.to.includes(link))
  );
  const burgerMobileNavigationLinks = [
    ...burgerMenuPluginsLinks,
    ...mapMobileNavigationLinks(burgerMobileNavigation),
  ];

  return (
    <>
      <MainNav>
        <NavBrand />

        <Divider />

        <MenuDetails>
          <NavListWrapper
            tag="ul"
            gap={3}
            direction={{
              initial: 'row',
              large: 'column',
            }}
            alignItems="center"
            justifyContent={{
              initial: 'center',
              large: 'flex-start',
            }}
            flex={1}
            paddingLeft={{
              initial: 3,
              large: 0,
            }}
            paddingRight={{
              initial: 3,
              large: 0,
            }}
            paddingTop={3}
            paddingBottom={3}
          >
            <MainNavIcons
              listLinks={listLinks}
              mobileLinks={topMobileNavigationLinks}
              handleClickOnLink={handleClickOnLink}
            />
          </NavListWrapper>
          <TrialCountdown />
          <Box
            display={{
              initial: 'none',
              large: 'flex',
            }}
            borderStyle="solid"
            borderWidth={{
              initial: 0,
              large: '1px 0 0 0',
            }}
            borderColor="neutral150"
            padding={3}
          >
            <NavUser />
          </Box>
        </MenuDetails>

        <Box
          padding={3}
          display={{
            initial: 'flex',
            large: 'none',
          }}
        >
          <Flex
            height="3.2rem"
            width="3.2rem"
            justifyContent="center"
            alignItems="center"
            onClick={() => setIsBurgerMenuShown(!isBurgerMenuShown)}
          >
            {!isBurgerMenuShown ? <List /> : <Cross />}
          </Flex>
        </Box>
      </MainNav>
      <NavBurgerMenu
        isShown={isBurgerMenuShown}
        listLinks={burgerMobileNavigationLinks}
        handleClickOnLink={handleClickOnLink}
      />
    </>
  );
};

export { LeftMenu };
