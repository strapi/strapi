import * as React from 'react';

import sortBy from 'lodash/sortBy';
import { useSelector } from 'react-redux';

import { SETTINGS_LINKS_CE, SettingsMenuLink } from '../constants';
import { useAppInfo } from '../features/AppInfo';
import { useAuth } from '../features/Auth';
import { useStrapiApp } from '../features/StrapiApp';
import { selectAdminPermissions } from '../selectors';
import { PermissionMap } from '../types/permissions';

import { useEnterprise } from './useEnterprise';

import type {
  StrapiAppSetting,
  StrapiAppSettingLink as IStrapiAppSettingLink,
} from '../core/apis/router';

const formatLinks = (menu: SettingsMenuSection[]): SettingsMenuSectionWithDisplayedLinks[] =>
  menu.map((menuSection) => {
    const formattedLinks = menuSection.links.map((link) => ({
      ...link,
      isDisplayed: false,
    }));

    return { ...menuSection, links: formattedLinks };
  });

interface SettingsMenuLinkWithPermissions extends SettingsMenuLink {
  permissions: IStrapiAppSettingLink['permissions'];
  hasNotification?: boolean;
}

interface StrapiAppSettingsLink extends IStrapiAppSettingLink {
  licenseOnly?: never;
  hasNotification?: never;
}

interface SettingsMenuSection extends Omit<StrapiAppSetting, 'links'> {
  links: Array<SettingsMenuLinkWithPermissions | StrapiAppSettingsLink>;
}

interface SettingsMenuLinkWithPermissionsAndDisplayed extends SettingsMenuLinkWithPermissions {
  isDisplayed: boolean;
}

interface StrapiAppSettingLinkWithDisplayed extends StrapiAppSettingsLink {
  isDisplayed: boolean;
}

interface SettingsMenuSectionWithDisplayedLinks extends Omit<SettingsMenuSection, 'links'> {
  links: Array<SettingsMenuLinkWithPermissionsAndDisplayed | StrapiAppSettingLinkWithDisplayed>;
}

type SettingsMenu = SettingsMenuSectionWithDisplayedLinks[];

const useSettingsMenu = (): {
  isLoading: boolean;
  menu: SettingsMenu;
} => {
  const [{ isLoading, menu }, setData] = React.useState<{
    isLoading: boolean;
    menu: SettingsMenu;
  }>({
    isLoading: true,
    menu: [],
  });
  const checkUserHasPermission = useAuth(
    'useSettingsMenu',
    (state) => state.checkUserHasPermissions
  );
  const shouldUpdateStrapi = useAppInfo('useSettingsMenu', (state) => state.shouldUpdateStrapi);
  const settings = useStrapiApp('useSettingsMenu', (state) => state.settings);
  const permissions = useSelector(selectAdminPermissions);

  /**
   * memoize the return value of this function to avoid re-computing it on every render
   * because it's used in an effect it ends up re-running recursively.
   */
  const ceLinks = React.useMemo(() => SETTINGS_LINKS_CE(), []);

  const { admin: adminLinks, global: globalLinks } = useEnterprise(
    ceLinks,
    async () => (await import('../../../ee/admin/src/constants')).SETTINGS_LINKS_EE(),
    {
      combine(ceLinks, eeLinks) {
        return {
          admin: [...eeLinks.admin, ...ceLinks.admin],
          global: [...ceLinks.global, ...eeLinks.global],
        };
      },
      defaultValue: {
        admin: [],
        global: [],
      },
    }
  );

  const addPermissions = React.useCallback(
    (link: SettingsMenuLink) => {
      if (!link.id) {
        throw new Error('The settings menu item must have an id attribute.');
      }

      return {
        ...link,
        permissions: permissions.settings?.[link.id as keyof PermissionMap['settings']]?.main ?? [],
      } satisfies SettingsMenuLinkWithPermissions;
    },
    [permissions.settings]
  );

  React.useEffect(() => {
    const getData = async () => {
      interface MenuLinkPermission {
        hasPermission: boolean;
        sectionIndex: number;
        linkIndex: number;
      }

      const buildMenuPermissions = (sections: SettingsMenuSectionWithDisplayedLinks[]) =>
        Promise.all(
          sections.reduce<Promise<MenuLinkPermission>[]>((acc, section, sectionIndex) => {
            const linksWithPermissions = section.links.map(async (link, linkIndex) => ({
              hasPermission: (await checkUserHasPermission(link.permissions)).length > 0,
              sectionIndex,
              linkIndex,
            }));

            return [...acc, ...linksWithPermissions];
          }, [])
        );

      const menuPermissions = await buildMenuPermissions(sections);

      setData((prev) => {
        return {
          ...prev,
          isLoading: false,
          menu: sections.map((section, sectionIndex) => ({
            ...section,
            links: section.links.map((link, linkIndex) => {
              const permission = menuPermissions.find(
                (permission) =>
                  permission.sectionIndex === sectionIndex && permission.linkIndex === linkIndex
              );

              return {
                ...link,
                isDisplayed: Boolean(permission?.hasPermission),
              };
            }),
          })),
        };
      });
    };

    const { global, ...otherSections } = settings;
    const sections = formatLinks([
      {
        ...global,
        links: sortBy([...global.links, ...globalLinks.map(addPermissions)], (link) => link.id).map(
          (link) => ({
            ...link,
            hasNotification: link.id === '000-application-infos' && shouldUpdateStrapi,
          })
        ),
      },
      {
        id: 'permissions',
        intlLabel: { id: 'Settings.permissions', defaultMessage: 'Administration Panel' },
        links: adminLinks.map(addPermissions),
      },
      ...Object.values(otherSections),
    ]);

    getData();
  }, [
    adminLinks,
    globalLinks,
    settings,
    shouldUpdateStrapi,
    addPermissions,
    checkUserHasPermission,
  ]);

  return {
    isLoading,
    menu: menu.map((menuItem) => ({
      ...menuItem,
      links: menuItem.links.filter((link) => link.isDisplayed),
    })),
  };
};

export { useSettingsMenu };
export type { SettingsMenu };
