import { useContext, useEffect, useReducer } from 'react';
import { useGlobalContext, hasPermissions, UserContext } from 'strapi-helper-plugin';

import reducer, { initialState } from './reducer';
import init from './init';

const useSettingsMenu = () => {
  const permissions = useContext(UserContext);
  const { plugins } = useGlobalContext();

  const [{ isLoading, menu }, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, plugins)
  );

  useEffect(() => {
    const getData = async () => {
      const checkPermissions = async (link, permissionsToCheck, sectionId, path) => {
        const hasPermission = await hasPermissions(permissions, permissionsToCheck);

        return { linkId: link.to, hasPermission, sectionId, path };
      };

      const generateArrayOfPromises = array => {
        return array.reduce((acc, current, sectionIndex) => {
          const generateArrayOfPromises = array =>
            array.map((link, index) =>
              checkPermissions(
                link,
                array[index].permissions,
                current.id,
                `${sectionIndex}.links.${index}`
              )
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

    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions]);

  return { isLoading, menu };
};

export default useSettingsMenu;
