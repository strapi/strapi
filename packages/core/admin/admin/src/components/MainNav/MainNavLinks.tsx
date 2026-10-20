import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { Lightning } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { type To } from 'react-router-dom';
import { styled } from 'styled-components';

import { useIsDesktop } from '../../hooks/useMediaQuery';
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

/**
 * Will attach a guided tour tooltip to the right links. (mostly used for the finish step to indicate the next tour)
 * @param to: The target link
 * @param children: The original link to be wrapped in a guided tour tooltip
 * @returns The link wrapped in a guided tour tooltip or the original link if no guided tour needs to be attached
 */
const GuidedTourTooltip = ({ to, children }: { to: To; children: React.ReactNode }) => {
  const normalizedTo = to.toString().replace(/\//g, '');

  switch (normalizedTo) {
    // We attach the final step of the content type builder tour on content manager link because it's the next tour (Content Type Builder -> Content Manager).
    case 'content-manager':
      return <tours.contentTypeBuilder.Finish>{children}</tours.contentTypeBuilder.Finish>;
    // We attach the final step of the api tokens tour on the home link because it was the last tour (API Tokens -> Go back to homepage).
    case '':
      return <tours.apiTokens.Finish>{children}</tours.apiTokens.Finish>;
    // We attach the final step of the content manager tour on the settings link because it's the next tour (Content Manager -> API tokens).
    case 'settings':
      return <tours.contentManager.Finish>{children}</tours.contentManager.Finish>;
    // If the link doesn't match any of the above, we return the original link.
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
  const isDesktop = useIsDesktop();

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

        const LinkElement = () => (
          <NavLink.NavButton
            to={link.to}
            target={link.target}
            onClick={() => handleClickOnLink(link.to)}
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
          </NavLink.NavButton>
        );

        return isDesktop || (!isDesktop && linkMobile) ? (
          <Flex tag="li" key={link.to}>
            <GuidedTourTooltip to={link.to}>
              <NavLink.Tooltip position={isDesktop ? 'right' : 'bottom'} label={labelValue}>
                <LinkElement />
              </NavLink.Tooltip>
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
          <Flex alignItems="center" tag="li" key={navigationTarget}>
            <NavLink.Link
              to={navigationTarget}
              onClick={() => handleClickOnLink(navigationTarget)}
              aria-label={labelValue}
            >
              <Flex alignItems="center" gap={3}>
                <IconContainer>
                  <LinkIcon width="20" height="20" fill="neutral500" />
                </IconContainer>
                <Typography>{labelValue}</Typography>
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
              </Flex>
            </NavLink.Link>
          </Flex>
        );
      })
    : null;
};

export { MainNavIcons, MainNavBurgerMenuLinks };
