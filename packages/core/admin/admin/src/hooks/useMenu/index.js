import { useEffect, useReducer, useRef } from 'react';

import { useAppInfo, useRBACProvider, useStrapiApp } from '@strapi/helper-plugin';
import { useSelector } from 'react-redux';

import { ADMIN_PERMISSIONS_SELECTOR } from '../../constants';

import reducer, { initialState } from './reducer';
import getGeneralLinks from './utils/getGeneralLinks';
import getPluginSectionLinks from './utils/getPluginSectionLinks';

const useMenu = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { allPermissions: userPermissions } = useRBACProvider();
  const { shouldUpdateStrapi } = useAppInfo();
  const { menu } = useStrapiApp();
  const permissions = useSelector(ADMIN_PERMISSIONS_SELECTOR);

  // We are using a ref because we don't want our effect to have this in its dependencies array
  const generalSectionLinksRef = useRef(state.generalSectionLinks);
  const shouldUpdateStrapiRef = useRef(shouldUpdateStrapi);
  // Once in the app lifecycle the menu should not be added into any dependencies array

  const resolvePermissions = async () => {
    const pluginsSectionLinks = menu;

    const authorizedPluginSectionLinks = await getPluginSectionLinks(
      userPermissions,
      pluginsSectionLinks,
      permissions
    );

    const authorizedGeneralSectionLinks = await getGeneralLinks(
      userPermissions,
      generalSectionLinksRef.current,
      shouldUpdateStrapiRef.current,
      permissions
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
    resolvePermissionsRef.current(userPermissions);
  }, [userPermissions, dispatch]);

  return state;
};

export default useMenu;
