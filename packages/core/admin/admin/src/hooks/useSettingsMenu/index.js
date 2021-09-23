import { useEffect, useReducer } from 'react';
import { hasPermissions, useRBACProvider, useStrapiApp, useAppInfos } from '@strapi/helper-plugin';

import reducer, { initialState } from './reducer';
import init from './init';

const useSettingsMenu = (noCheck = false) => {
  const { allPermissions: permissions } = useRBACProvider();
  const { shouldUpdateStrapi } = useAppInfos();
  const { settings } = useStrapiApp();

  const [{ isLoading, menu }, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, { settings, shouldUpdateStrapi })
  );

  useEffect(() => {
    const getData = async () => {
      const checkPermissions = async (permissionsToCheck, path) => {
        const hasPermission = await hasPermissions(permissions, permissionsToCheck);

        return { hasPermission, path };
      };

      const generateArrayOfPromises = array => {
        return array.reduce((acc, current, sectionIndex) => {
          const generateArrayOfPromises = array =>
            array.map((link, index) =>
              checkPermissions(array[index].permissions, `${sectionIndex}.links.${index}`)
            );

          return [...acc, ...generateArrayOfPromises(current.links)];
        }, []);
      };

      const generalSectionLinksArrayOfPromises = generateArrayOfPromises(menu);

      const data = await Promise.all(generalSectionLinksArrayOfPromises);

      dispatch({
        type: 'CHECK_PERMISSIONS_SUCCEEDED',
        data,
      });
    };

    // This hook is also used by the main LeftMenu component in order to know which sections it needs to display/hide
    // Therefore, we don't need to make the checking all the times when the hook is used.
    if (!noCheck) {
      getData();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions, noCheck]);

  return { isLoading, menu };
};

export default useSettingsMenu;
