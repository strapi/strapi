import * as React from 'react';

import { useAppInfo, useRBACProvider, useStrapiApp } from '@strapi/helper-plugin';
import { Cog, Puzzle, ShoppingCart } from '@strapi/icons';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../pages/App/selectors';

import getGeneralLinks from './utils/getGeneralLinks';
import getPluginSectionLinks from './utils/getPluginSectionLinks';

const useMenu = () => {
  const { allPermissions: userPermissions } = useRBACProvider();
  const { shouldUpdateStrapi } = useAppInfo();
  const { menu } = useStrapiApp();
  const permissions = useSelector(selectAdminPermissions);
  const [menuWithUserPermissions, setMenuWithUserPermissions] = React.useState({
    generalSectionLinks: [
      {
        icon: Puzzle,
        intlLabel: {
          id: 'global.plugins',
          defaultMessage: 'Plugins',
        },
        to: '/list-plugins',
        permissions: permissions.marketplace.main,
      },
      {
        icon: ShoppingCart,
        intlLabel: {
          id: 'global.marketplace',
          defaultMessage: 'Marketplace',
        },
        to: '/marketplace',
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

export default useMenu;
