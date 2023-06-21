import { useEffect, useReducer, useRef } from 'react';

import { useAppInfo, useRBACProvider, useStrapiApp } from '@strapi/helper-plugin';

import reducer, { initialState } from './reducer';
import getGeneralLinks from './utils/getGeneralLinks';
import getPluginSectionLinks from './utils/getPluginSectionLinks';

const useMenu = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { allPermissions } = useRBACProvider();
  const { shouldUpdateStrapi } = useAppInfo();
  const { menu } = useStrapiApp();

  // We are using a ref because we don't want our effect to have this in its dependencies array
  const generalSectionLinksRef = useRef(state.generalSectionLinks);
  const shouldUpdateStrapiRef = useRef(shouldUpdateStrapi);
  // Once in the app lifecycle the menu should not be added into any dependencies array

  const resolvePermissions = async (permissions = allPermissions) => {
    const pluginsSectionLinks = menu;

    const authorizedPluginSectionLinks = await getPluginSectionLinks(
      permissions,
      pluginsSectionLinks
    );

    const authorizedGeneralSectionLinks = await getGeneralLinks(
      permissions,
      generalSectionLinksRef.current,
      shouldUpdateStrapiRef.current
    );

    dispatch({
      type: 'SET_SECTION_LINKS',
      data: {
        authorizedGeneralSectionLinks,
        authorizedPluginSectionLinks,
      },
    });
    dispatch({ type: 'UNSET_IS_LOADING' });
  };

  const resolvePermissionsRef = useRef(resolvePermissions);

  useEffect(() => {
    resolvePermissionsRef.current(allPermissions);
  }, [allPermissions, dispatch]);

  return state;
};

export default useMenu;
