import { Box, Flex, Typography } from '@strapi/design-system';
import { Lightning } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { type To, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

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
  handleClickOnLink,
}: {
  listLinks: MenuItem[];
  handleClickOnLink: (value: string) => void;
}) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();

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
          <Flex tag="li" key={link.to}>
            <GuidedTourTooltip to={link.to}>
              <NavLink.Link
                to={link.to}
                onClick={(e) => {
                  if (link.navigationLink) {
                    e.preventDefault();
                    navigate(navigationTarget);
                  }
                  handleClickOnLink(navigationTarget);
                }}
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
        );
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
  const navigate = useNavigate();

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
          <Flex paddingTop={3} alignItems="center" tag="li" key={link.to}>
            <GuidedTourTooltip to={link.to}>
              <NavLink.Link
                to={link.to}
                onClick={(e) => {
                  if (link.navigationLink) {
                    e.preventDefault();
                    handleClickOnLink(navigationTarget);
                    navigate(navigationTarget);
                  } else {
                    handleClickOnLink(navigationTarget);
                  }
                }}
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
            </GuidedTourTooltip>
          </Flex>
        );
      })
    : null;
};

export { MainNavIcons, MainNavBurgerMenuLinks };
