import * as React from 'react';

import { Divider, Flex } from '@strapi/design-system';
import { Feather, Lock, House } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { useAuth } from '../features/Auth';
import { useTracking } from '../features/Tracking';
import { Menu, MenuItem } from '../hooks/useMenu';
import { getDisplayName } from '../utils/users';

import { MainNav } from './MainNav/MainNav';
import { NavBrand } from './MainNav/NavBrand';
import { NavLink } from './MainNav/NavLink';
import { NavUser } from './MainNav/NavUser';

const NewNavLinkBadge = styled(NavLink.Badge)`
  span {
    color: ${({ theme }) => theme.colors.neutral0};
  }
`;

const NavListWrapper = styled(Flex)`
  overflow-y: auto;
`;

interface LeftMenuProps extends Pick<Menu, 'generalSectionLinks' | 'pluginsSectionLinks'> {}

const arrayMove = (arr: MenuItem[], oldIndex: number, newIndex: number) => {
  if (newIndex >= arr.length) {
    return arr;
  }
  arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);
  return arr;
};

const LeftMenu = ({ generalSectionLinks, pluginsSectionLinks }: LeftMenuProps) => {
  const user = useAuth('AuthenticatedApp', (state) => state.user);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { pathname } = useLocation();
  const userDisplayName = getDisplayName(user);

  const initials = userDisplayName
    .split(' ')
    .map((name) => name.substring(0, 1))
    .join('')
    .substring(0, 2);

  const handleClickOnLink = (destination: string) => {
    trackUsage('willNavigate', { from: pathname, to: destination });
  };

  let listLinks = [...pluginsSectionLinks, ...generalSectionLinks];

  /**
   * Move the documentation link before the settings
   */
  const documentLinkIndex = listLinks.findIndex((link) => link.to.includes('documentation'));

  if (documentLinkIndex > -1) {
    listLinks = arrayMove(listLinks, documentLinkIndex, listLinks.length - 2);
  }

  return (
    <MainNav>
      <NavBrand />

      <Divider />

      <NavListWrapper as="ul" gap={3} direction="column" flex={1} paddingTop={3} paddingBottom={3}>
        <Flex as="li">
          <NavLink.Link
            to="/"
            onClick={() => handleClickOnLink('/')}
            aria-label={formatMessage({ id: 'global.home', defaultMessage: 'Home' })}
          >
            <NavLink.Tooltip label={formatMessage({ id: 'global.home', defaultMessage: 'Home' })}>
              <NavLink.Icon>
                <House fill="neutral500" />
              </NavLink.Icon>
            </NavLink.Tooltip>
          </NavLink.Link>
        </Flex>
        <Flex as="li">
          <NavLink.Link
            to="/content-manager"
            onClick={() => handleClickOnLink('/content-manager')}
            aria-label={formatMessage({
              id: 'global.content-manager',
              defaultMessage: 'Content Manager',
            })}
          >
            <NavLink.Tooltip
              label={formatMessage({
                id: 'global.content-manager',
                defaultMessage: 'Content Manager',
              })}
            >
              <NavLink.Icon>
                <Feather fill="neutral500" />
              </NavLink.Icon>
            </NavLink.Tooltip>
          </NavLink.Link>
        </Flex>
        {listLinks.length > 0
          ? listLinks.map((link) => {
              if (link.to === 'content-manager') {
                return null;
              }

              const LinkIcon = link.icon;
              const badgeContentLock = link?.lockIcon ? <Lock /> : undefined;

              const badgeContentNumeric =
                link.notificationsCount && link.notificationsCount > 0
                  ? link.notificationsCount.toString()
                  : undefined;

              const labelValue = formatMessage(link.intlLabel);
              return (
                <Flex as="li" key={link.to}>
                  <NavLink.Link
                    to={link.to}
                    onClick={() => handleClickOnLink(link.to)}
                    aria-label={labelValue}
                  >
                    <NavLink.Tooltip label={labelValue}>
                      <NavLink.Icon>
                        <LinkIcon fill="neutral500" />
                      </NavLink.Icon>
                      {badgeContentLock ? (
                        <NavLink.Badge
                          label="locked"
                          background="transparent"
                          textColor="neutral500"
                        >
                          {badgeContentLock}
                        </NavLink.Badge>
                      ) : badgeContentNumeric ? (
                        <NewNavLinkBadge label={badgeContentNumeric} backgroundColor="primary600">
                          {badgeContentNumeric}
                        </NewNavLinkBadge>
                      ) : null}
                    </NavLink.Tooltip>
                  </NavLink.Link>
                </Flex>
              );
            })
          : null}
        {/* {generalSectionLinks.length > 0
          ? generalSectionLinks.map((link) => {
              const LinkIcon = link.icon;

              const badgeContent =
                link.notificationsCount && link.notificationsCount > 0
                  ? link.notificationsCount.toString()
                  : undefined;

              const labelValue = formatMessage(link.intlLabel);

              return (
                <Flex as="li" key={link.to}>
                  <NavLink.Link
                    aria-label={labelValue}
                    to={link.to}
                    onClick={() => handleClickOnLink(link.to)}
                  >
                    <NavLink.Tooltip label={labelValue}>
                      <NavLink.Icon>
                        <LinkIcon fill="neutral500" />
                      </NavLink.Icon>
                      {badgeContent && (
                        <NewNavLinkBadge label={badgeContent} backgroundColor="primary600">
                          {badgeContent}
                        </NewNavLinkBadge>
                      )}
                    </NavLink.Tooltip>
                  </NavLink.Link>
                </Flex>
              );
            })
          : null} */}
      </NavListWrapper>
      <NavUser initials={initials}>{userDisplayName}</NavUser>
    </MainNav>
  );
};

export { LeftMenu };
