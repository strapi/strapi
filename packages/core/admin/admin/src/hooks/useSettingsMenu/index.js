import { useState, useEffect } from 'react';
import { hasPermissions, useRBACProvider, useStrapiApp, useAppInfo } from '@strapi/helper-plugin';

import sortLinks from './utils/sortLinks';
import formatLinks from './utils/formatLinks';
import { useEnterprise } from '../useEnterprise';

import { LINKS_CE } from './constants';

const useSettingsMenu = () => {
  const [{ isLoading, menu }, setData] = useState({
    isLoading: true,
    menu: [],
  });
  const { allPermissions: permissions } = useRBACProvider();
  const { shouldUpdateStrapi } = useAppInfo();
  const { settings } = useStrapiApp();
  const { global: globalLinks, admin: adminLinks } = useEnterprise(
    LINKS_CE,
    async () => (await import('../../../../ee/admin/hooks/useSettingsMenu/constants')).LINKS_EE,
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

  useEffect(() => {
    const getData = async () => {
      const buildMenuPermissions = (sections) =>
        Promise.all(
          sections.reduce((acc, section, sectionIndex) => {
            const buildMenuPermissions = (links) =>
              links.map(async (link, linkIndex) => ({
                hasPermission: await hasPermissions(permissions, link.permissions),
                sectionIndex,
                linkIndex,
              }));

            return [...acc, ...buildMenuPermissions(section.links)];
          }, [])
        );

      const menuPermissions = await buildMenuPermissions(sections);

      setData((prev) => ({
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
              isDisplayed: Boolean(permission.hasPermission),
            };
          }),
        })),
      }));
    };

    const { global, ...otherSections } = settings;
    const sections = formatLinks([
      {
        ...settings.global,
        links: sortLinks([...settings.global.links, ...globalLinks]).map((link) => ({
          ...link,
          hasNotification: link.id === '000-application-infos' && shouldUpdateStrapi,
        })),
      },
      {
        id: 'permissions',
        intlLabel: { id: 'Settings.permissions', defaultMessage: 'Administration Panel' },
        links: adminLinks,
      },
      ...Object.values(otherSections),
    ]);

    getData();
  }, [adminLinks, globalLinks, permissions, settings, shouldUpdateStrapi]);

  return { isLoading, menu };
};

export default useSettingsMenu;
