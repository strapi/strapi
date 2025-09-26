import { useState, useEffect } from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { Lightning } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { type To } from 'react-router-dom';
import { styled, useTheme } from 'styled-components';

import { MenuItem } from '../../hooks/useMenu';
import { tours } from '../GuidedTour/Tours';

import { NavLink } from './NavLink';

const NavLinkBadgeLock = styled(NavLink.Badge)`
  background-color: transparent;
`;

const NavLinkBadgeCounter = styled(NavLink.Badge)`
  span {
    color: ${({ theme }) => theme.colors.neutral0};
  }
`;

const GuidedTourTooltip = ({ to, children }: { to: To; children: React.ReactNode }) => {
  const normalizedTo = to.toString().replace(/\//g, '');

  switch (normalizedTo) {
    case 'content-manager':
      return <tours.contentTypeBuilder.Finish>{children}</tours.contentTypeBuilder.Finish>;
    case '':
      return <tours.apiTokens.Finish>{children}</tours.apiTokens.Finish>;
    case 'settings':
      return <tours.contentManager.Finish>{children}</tours.contentManager.Finish>;
    default:
      return children;
  }
};

const MainNavIcons = ({
  listLinks,
  mobileLinks,
  handleClickOnLink,
}: {
  listLinks: MenuItem[];
  mobileLinks: MenuItem[];
  handleClickOnLink: (value: string) => void;
}) => {
  const { formatMessage } = useIntl();
  const theme = useTheme();

  const minWidthTablet = theme.breakpoints.medium.replace('@media', '');
  const minWidthDesktop = theme.breakpoints.large.replace('@media', '');
  const [isAboveTablet, setIsAboveTablet] = useState(window.matchMedia(minWidthTablet).matches);
  const [isDesktop, setIsDesktop] = useState(window.matchMedia(minWidthDesktop).matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(minWidthTablet);
    const handler = (e: MediaQueryListEvent) => setIsAboveTablet(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [minWidthTablet]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(minWidthDesktop);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [minWidthDesktop]);

  return listLinks.length > 0
    ? listLinks.map((link) => {
        const LinkIcon = link.icon;
        const badgeContentLock = link?.licenseOnly ? <Lightning fill="primary600" /> : undefined;

        const badgeContentNumeric =
          link.notificationsCount && link.notificationsCount > 0
            ? link.notificationsCount.toString()
            : undefined;

        const labelValue = formatMessage(link.intlLabel);
        const linkMobile = mobileLinks.find((mobileLink) => mobileLink.to === link.to);
        const mobileLinkCustomLink = linkMobile?.navigationLink;
        const linkTarget = !isAboveTablet && mobileLinkCustomLink ? mobileLinkCustomLink : link.to;

        return isDesktop || (!isDesktop && linkMobile) ? (
          <Flex tag="li" key={link.to}>
            <GuidedTourTooltip to={linkTarget}>
              <NavLink.Link
                to={linkTarget}
                onClick={() => handleClickOnLink(linkTarget)}
                aria-label={labelValue}
              >
                <NavLink.Icon label={labelValue}>
                  <LinkIcon width="20" height="20" fill="neutral500" />
                </NavLink.Icon>
                {badgeContentLock ? (
                  <NavLinkBadgeLock
                    label="locked"
                    textColor="neutral500"
                    paddingLeft={0}
                    paddingRight={0}
                  >
                    {badgeContentLock}
                  </NavLinkBadgeLock>
                ) : badgeContentNumeric ? (
                  <NavLinkBadgeCounter
                    label={badgeContentNumeric}
                    backgroundColor="primary600"
                    width="2.3rem"
                    color="neutral0"
                  >
                    {badgeContentNumeric}
                  </NavLinkBadgeCounter>
                ) : null}
              </NavLink.Link>
            </GuidedTourTooltip>
          </Flex>
        ) : null;
      })
    : null;
};

const IconContainer = styled(Box)`
  svg {
    display: block;
  }
`;

const MainNavBurgerMenuLinks = ({
  listLinks,
  handleClickOnLink,
}: {
  listLinks: MenuItem[];
  handleClickOnLink: (value: string) => void;
}) => {
  const { formatMessage } = useIntl();

  return listLinks.length > 0
    ? listLinks.map((link) => {
        const LinkIcon = link.icon;
        const badgeContentLock = link?.licenseOnly ? <Lightning fill="primary600" /> : undefined;

        const badgeContentNumeric =
          link.notificationsCount && link.notificationsCount > 0
            ? link.notificationsCount.toString()
            : undefined;

        const labelValue = formatMessage(link.intlLabel);

        const navigationTarget = link.navigationLink || link.to;

        return (
          <Flex paddingTop={3} alignItems="center" tag="li" key={navigationTarget}>
            <NavLink.Link
              to={navigationTarget}
              onClick={() => handleClickOnLink(navigationTarget)}
              aria-label={labelValue}
            >
              <IconContainer marginRight="0.6rem">
                <LinkIcon width="20" height="20" fill="neutral500" />
              </IconContainer>
              <Typography marginLeft={3}>{labelValue}</Typography>
              {badgeContentLock ? (
                <NavLinkBadgeLock
                  label="locked"
                  textColor="neutral500"
                  paddingLeft={0}
                  paddingRight={0}
                >
                  {badgeContentLock}
                </NavLinkBadgeLock>
              ) : badgeContentNumeric ? (
                <NavLinkBadgeCounter
                  label={badgeContentNumeric}
                  backgroundColor="primary600"
                  width="2.3rem"
                  color="neutral0"
                >
                  {badgeContentNumeric}
                </NavLinkBadgeCounter>
              ) : null}
            </NavLink.Link>
          </Flex>
        );
      })
    : null;
};

export { MainNavIcons, MainNavBurgerMenuLinks };
