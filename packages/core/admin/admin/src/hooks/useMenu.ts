import * as React from 'react';

import { Cog, ShoppingCart, House } from '@strapi/icons';
import cloneDeep from 'lodash/cloneDeep';

import { useTypedSelector } from '../core/store/hooks';
import { useAuth, AuthContextValue } from '../features/Auth';
import { StrapiAppContextValue, useStrapiApp } from '../features/StrapiApp';

/* -------------------------------------------------------------------------------------------------
 * useMenu
 * -----------------------------------------------------------------------------------------------*/

export type MenuItem = Omit<StrapiAppContextValue['menu'][number], 'Component'> & {
  navigationLink?: string;
};
export type MobileMenuItem = {
  to: string;
  target?: string;
  link?: string;
};

export interface Menu {
  generalSectionLinks: MenuItem[];
  pluginsSectionLinks: MenuItem[];
  topMobileNavigation: MobileMenuItem[];
  burgerMobileNavigation: MobileMenuItem[];
  isLoading: boolean;
}

const useMenu = (shouldUpdateStrapi: boolean) => {
  const checkUserHasPermissions = useAuth('useMenu', (state) => state.checkUserHasPermissions);
  const rawMenu = useStrapiApp('useMenu', (state) => state.menu);
  const menu = React.useMemo(() => normalizeMenuLinks(rawMenu), [rawMenu]);
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const [menuWithUserPermissions, setMenuWithUserPermissions] = React.useState<Menu>({
    generalSectionLinks: [
      {
        icon: House,
        intlLabel: {
          id: 'global.home',
          defaultMessage: 'Home',
        },
        to: '/',
        permissions: [],
        position: 0,
      },
      {
        icon: ShoppingCart,
        intlLabel: {
          id: 'global.marketplace',
          defaultMessage: 'Marketplace',
        },
        to: 'https://market.strapi.io',
        target: '_blank',
        permissions: permissions.marketplace?.main ?? [],
        position: 7,
      },
      {
        icon: Cog,
        intlLabel: {
          id: 'global.settings',
          defaultMessage: 'Settings',
        },
        to: '/settings',
        // Permissions of this link are retrieved in the init phase
        // using the settings menu
        permissions: [],
        notificationsCount: 0,
        position: 9,
      },
    ],
    pluginsSectionLinks: [],
    topMobileNavigation: [
      {
        to: '/',
      },
      {
        to: 'content-manager',
      },
      {
        to: 'plugins/content-releases',
      },
      {
        to: 'plugins/upload',
      },
    ],
    burgerMobileNavigation: [
      {
        to: '/settings',
      },
    ],
    isLoading: true,
  });
  const generalSectionLinksRef = React.useRef(menuWithUserPermissions.generalSectionLinks);

  React.useEffect(() => {
    async function applyMenuPermissions() {
      const authorizedPluginSectionLinks = await getPluginSectionLinks(
        menu,
        checkUserHasPermissions
      );

      const authorizedGeneralSectionLinks = await getGeneralLinks(
        generalSectionLinksRef.current,
        shouldUpdateStrapi,
        checkUserHasPermissions
      );

      setMenuWithUserPermissions((state) => ({
        ...state,
        generalSectionLinks: authorizedGeneralSectionLinks,
        pluginsSectionLinks: authorizedPluginSectionLinks,
        isLoading: false,
      }));
    }

    applyMenuPermissions();
  }, [
    setMenuWithUserPermissions,
    generalSectionLinksRef,
    menu,
    permissions,
    shouldUpdateStrapi,
    checkUserHasPermissions,
  ]);

  return menuWithUserPermissions;
};

/* -------------------------------------------------------------------------------------------------
 * Utils
 * -----------------------------------------------------------------------------------------------*/

const getGeneralLinks = async (
  generalSectionRawLinks: MenuItem[],
  shouldUpdateStrapi: boolean = false,
  checkUserHasPermissions: AuthContextValue['checkUserHasPermissions']
) => {
  const generalSectionLinks = normalizeMenuLinks(generalSectionRawLinks);
  const generalSectionLinksPermissions = await Promise.all(
    generalSectionLinks.map(({ permissions }) => checkUserHasPermissions(permissions))
  );

  const authorizedGeneralSectionLinks = generalSectionLinks.filter(
    (_, index) => generalSectionLinksPermissions[index].length > 0
  );

  const settingsLinkIndex = authorizedGeneralSectionLinks.findIndex(
    (obj) => obj.to === '/settings'
  );

  if (settingsLinkIndex === -1) {
    return [];
  }

  const authorizedGeneralLinksClone = cloneDeep(authorizedGeneralSectionLinks);

  authorizedGeneralLinksClone[settingsLinkIndex].notificationsCount = shouldUpdateStrapi ? 1 : 0;

  return authorizedGeneralLinksClone;
};

const getPluginSectionLinks = async (
  pluginsSectionRawLinks: MenuItem[],
  checkUserHasPermissions: AuthContextValue['checkUserHasPermissions']
) => {
  const pluginSectionLinks = normalizeMenuLinks(pluginsSectionRawLinks);
  const pluginSectionLinksPermissions = await Promise.all(
    pluginSectionLinks.map(({ permissions }) => checkUserHasPermissions(permissions))
  );

  const authorizedPluginSectionLinks = pluginSectionLinks.filter(
    (_, index) => pluginSectionLinksPermissions[index].length > 0
  );

  return authorizedPluginSectionLinks;
};

const normalizeMenuLinks = (links: unknown): MenuItem[] => {
  if (!Array.isArray(links)) {
    return [];
  }

  const isValidIcon = (icon: unknown) => {
    if (typeof icon === 'string' || typeof icon === 'function' || React.isValidElement(icon)) {
      return true;
    }

    if (!icon || typeof icon !== 'object') {
      return false;
    }

    const reactType = (icon as { $$typeof?: symbol }).$$typeof;

    return (
      reactType === Symbol.for('react.forward_ref') ||
      reactType === Symbol.for('react.memo') ||
      reactType === Symbol.for('react.lazy')
    );
  };

  return links.reduce<MenuItem[]>((acc, link) => {
    if (!link || typeof link !== 'object') {
      return acc;
    }

    const candidate = link as Partial<MenuItem>;

    if (
      typeof candidate.to !== 'string' ||
      !isValidIcon(candidate.icon) ||
      typeof candidate.intlLabel?.id !== 'string' ||
      typeof candidate.intlLabel.defaultMessage !== 'string'
    ) {
      return acc;
    }

    acc.push({
      ...candidate,
      permissions: Array.isArray(candidate.permissions) ? candidate.permissions : [],
    } as MenuItem);

    return acc;
  }, []);
};

export { useMenu, normalizeMenuLinks };
