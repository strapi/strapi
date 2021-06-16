import { useEffect, useRef } from 'react';
import { useRBACProvider, useAppInfos, useStrapiApp } from '@strapi/helper-plugin';
import { useSelector, useDispatch } from 'react-redux';
import getPluginSectionLinks from './utils/getPluginSectionLinks';
import getGeneralLinks from './utils/getGeneralLinks';
import { setSectionLinks, unsetIsLoading } from './actions';
import selectMenuLinks from './selectors';

const useMenu = () => {
  const state = useSelector(selectMenuLinks);
  const dispatch = useDispatch();
  const { allPermissions } = useRBACProvider();
  const { shouldUpdateStrapi } = useAppInfos();
  const { menu } = useStrapiApp();

  // We are using a ref because we don't want our effect to have this in its dependencies array
  const generalSectionLinksRef = useRef(state.generalSectionLinks);
  const shouldUpdateStrapiRef = useRef(shouldUpdateStrapi);
  // Once in the app lifecycle the menu should not be added into any dependencies array
  const menuRef = useRef(menu);

  const resolvePermissions = async (permissions = allPermissions) => {
    const pluginsSectionLinks = menuRef.current;

    const authorizedPluginSectionLinks = await getPluginSectionLinks(
      permissions,
      pluginsSectionLinks
    );

    const authorizedGeneralSectionLinks = await getGeneralLinks(
      permissions,
      generalSectionLinksRef.current,
      shouldUpdateStrapiRef.current
    );

    dispatch(setSectionLinks(authorizedGeneralSectionLinks, authorizedPluginSectionLinks));
    dispatch(unsetIsLoading());
  };

  const resolvePermissionsRef = useRef(resolvePermissions);

  useEffect(() => {
    resolvePermissionsRef.current(allPermissions);
  }, [allPermissions, dispatch]);

  return state;
};

export default useMenu;
