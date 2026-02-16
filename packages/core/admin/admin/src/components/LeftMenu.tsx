import * as React from 'react';

import { Box, Divider, Flex, FlexComponent, IconButton, useCollator } from '@strapi/design-system';
import { Cross, List } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { styled } from 'styled-components';

import { useTracking } from '../features/Tracking';
import { useIsDesktop } from '../hooks/useMediaQuery';
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
  const isDesktop = useIsDesktop();

  const handleClickOnLink = (destination: string) => {
    trackUsage('willNavigate', { from: pathname, to: destination });
  };

  // Close burger menu when route changes
  React.useEffect(() => {
    setIsBurgerMenuShown(false);
  }, [pathname]);

  const listLinksAlphabeticallySorted = [...pluginsSectionLinks, ...generalSectionLinks].sort(
    (a, b) => formatter.compare(formatMessage(a.intlLabel), formatMessage(b.intlLabel))
  );
  const listLinks = sortLinks(listLinksAlphabeticallySorted);

  /**
   * Return filtered mobile navigation links (used for both top and burger menu)
   */
  const mapMobileNavigationLinks = (mobileNavLinks: MobileMenuItem[]): MenuItem[] =>
    mobileNavLinks.reduce<MenuItem[]>((acc, mobileLink) => {
      const linkFound = listLinks.find((link) => link.to === mobileLink.to);
      if (linkFound) {
        acc.push(mobileLink.link ? { ...linkFound, navigationLink: mobileLink.link } : linkFound);
      }
      return acc;
    }, []);

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

        {isDesktop && <Divider />}

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
          <IconButton
            onClick={() => setIsBurgerMenuShown((prev) => !prev)}
            style={{ border: 'none' }}
            label="Menu"
            type="button"
            aria-expanded={isBurgerMenuShown}
            aria-controls="burger-menu"
          >
            {!isBurgerMenuShown ? <List fill="neutral1000" /> : <Cross fill="neutral1000" />}
          </IconButton>
        </Box>
      </MainNav>
      <NavBurgerMenu
        isShown={isBurgerMenuShown}
        listLinks={burgerMobileNavigationLinks}
        handleClickOnLink={handleClickOnLink}
        onClose={() => setIsBurgerMenuShown(false)}
      />
    </>
  );
};

export { LeftMenu };
