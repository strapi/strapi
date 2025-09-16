import * as React from 'react';

import { Box, Divider, Flex, FlexComponent, ScrollArea, useCollator } from '@strapi/design-system';
import { Cross, List } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { styled } from 'styled-components';

import { useTracking } from '../features/Tracking';
import { Menu, MenuItem } from '../hooks/useMenu';

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
  overflow-y: auto;
`;

interface LeftMenuProps extends Pick<Menu, 'generalSectionLinks' | 'pluginsSectionLinks'> {}

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

const LeftMenu = ({ generalSectionLinks, pluginsSectionLinks }: LeftMenuProps) => {
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

  return (
    <>
      <MainNav>
        <NavBrand />

        <Divider />

        <MenuDetails>
          <ScrollArea>
            <NavListWrapper
              tag="ul"
              gap={3}
              direction={{
                initial: 'row',
                large: 'column',
              }}
              justifyContent="center"
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
                listLinks={listLinks.filter((link) => link.mobileNavigation?.top)}
                handleClickOnLink={handleClickOnLink}
              />
            </NavListWrapper>
          </ScrollArea>
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
        listLinks={listLinks.filter((link) => link.mobileNavigation?.burger)}
        handleClickOnLink={handleClickOnLink}
      />
    </>
  );
};

export { LeftMenu };
