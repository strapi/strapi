import * as React from 'react';

import {
  Permission,
  hasPermissions,
  useAppInfo,
  useRBACProvider,
  useStrapiApp,
  StrapiAppContextValue,
} from '@strapi/helper-plugin';
import { Cog, Puzzle, ShoppingCart } from '@strapi/icons';
import cloneDeep from 'lodash/cloneDeep';
import { useSelector } from 'react-redux';

// @ts-expect-error - no types, yet.
import { selectAdminPermissions } from '../pages/App/selectors';

/* -------------------------------------------------------------------------------------------------
 * useMenu
 * -----------------------------------------------------------------------------------------------*/

type MenuItem = StrapiAppContextValue['menu'][number];

export interface Menu {
  generalSectionLinks: MenuItem[];
  pluginsSectionLinks: MenuItem[];
  isLoading: boolean;
}

const useMenu = () => {
  const { allPermissions: userPermissions } = useRBACProvider();
  const { shouldUpdateStrapi } = useAppInfo();
  const { menu } = useStrapiApp();
  const permissions = useSelector(selectAdminPermissions);
  const [menuWithUserPermissions, setMenuWithUserPermissions] = React.useState<Menu>({
    generalSectionLinks: [
      {
        icon: Puzzle,
        intlLabel: {
          id: 'global.plugins',
          defaultMessage: 'Plugins',
        },
        to: '/list-plugins',
        // @ts-expect-error - we need the permissions type from the plugin
        permissions: permissions.marketplace.main,
      },
      {
        icon: ShoppingCart,
        intlLabel: {
          id: 'global.marketplace',
          defaultMessage: 'Marketplace',
        },
        to: '/marketplace',
        // @ts-expect-error - we need the permissions type from the plugin
        permissions: permissions.marketplace.main,
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
      },
    ],
    pluginsSectionLinks: [],
    isLoading: true,
  });
  const generalSectionLinksRef = React.useRef(menuWithUserPermissions.generalSectionLinks);

  React.useEffect(() => {
    async function applyMenuPermissions() {
      const authorizedPluginSectionLinks = await getPluginSectionLinks(userPermissions, menu);

      const authorizedGeneralSectionLinks = await getGeneralLinks(
        userPermissions,
        generalSectionLinksRef.current,
        shouldUpdateStrapi
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
    userPermissions,
    menu,
    permissions,
    shouldUpdateStrapi,
  ]);

  return menuWithUserPermissions;
};

/* -------------------------------------------------------------------------------------------------
 * Utils
 * -----------------------------------------------------------------------------------------------*/

const getGeneralLinks = async (
  userPermissions: Permission[],
  generalSectionRawLinks: MenuItem[],
  shouldUpdateStrapi: boolean = false
) => {
  const generalSectionLinksPermissions = await Promise.all(
    generalSectionRawLinks.map(({ permissions }) => hasPermissions(userPermissions, permissions))
  );

  const authorizedGeneralSectionLinks = generalSectionRawLinks.filter(
    (_, index) => generalSectionLinksPermissions[index]
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
  userPermissions: Permission[],
  pluginsSectionRawLinks: MenuItem[]
) => {
  const pluginSectionLinksPermissions = await Promise.all(
    pluginsSectionRawLinks.map(({ permissions }) => hasPermissions(userPermissions, permissions))
  );

  const authorizedPluginSectionLinks = pluginsSectionRawLinks.filter(
    (_, index) => pluginSectionLinksPermissions[index]
  );

  return authorizedPluginSectionLinks;
};

export { useMenu };
