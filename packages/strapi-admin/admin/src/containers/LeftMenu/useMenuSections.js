import { useEffect, useRef } from 'react';
import { useUser } from 'strapi-helper-plugin';
import { useSelector, useDispatch } from 'react-redux';
import getCtOrStLinks from './utils/getCtOrStLinks';
import getPluginSectionLinks from './utils/getPluginSectionLinks';
import getGeneralLinks from './utils/getGeneralLinks';
import { setCtOrStLinks, setSectionLinks, toggleIsLoading, unsetIsLoading } from './actions';
import useSettingsMenu from '../../hooks/useSettingsMenu';
import toPluginLinks from './utils/toPluginLinks';
import selectMenuLinks from './selectors';

const useMenuSections = (plugins, shouldUpdateStrapi) => {
  const state = useSelector(selectMenuLinks);
  const dispatch = useDispatch();
  const { userPermissions } = useUser();
  const { menu: settingsMenu } = useSettingsMenu(true);
  // We are using a ref because we don't want our effect to have this in its dependencies array
  const generalSectionLinksRef = useRef(state.generalSectionLinks);
  const shouldUpdateStrapiRef = useRef(shouldUpdateStrapi);
  // Since the settingsMenu is not managing any state because of the true argument we can use a ref here
  // so we don't need to add it to the effect dependencies array
  const settingsMenuRef = useRef(settingsMenu);
  // Once in the app lifecycle the plugins should not be added into any dependencies array, in order to prevent
  // the effect to be run when another plugin is using one plugins internal api for instance
  // so it's definitely ok to use a ref here
  const pluginsRef = useRef(plugins);

  const toggleLoading = () => dispatch(toggleIsLoading());

  const resolvePermissions = async (permissions = userPermissions) => {
    const pluginsSectionLinks = toPluginLinks(pluginsRef.current);
    const { authorizedCtLinks, authorizedStLinks, contentTypes } = await getCtOrStLinks(
      permissions
    );

    const authorizedPluginSectionLinks = await getPluginSectionLinks(
      permissions,
      pluginsSectionLinks
    );

    const authorizedGeneralSectionLinks = await getGeneralLinks(
      permissions,
      generalSectionLinksRef.current,
      settingsMenuRef.current,
      shouldUpdateStrapiRef.current
    );

    dispatch(setCtOrStLinks(authorizedCtLinks, authorizedStLinks, contentTypes));
    dispatch(setSectionLinks(authorizedGeneralSectionLinks, authorizedPluginSectionLinks));
    dispatch(unsetIsLoading());
  };

  const resolvePermissionsRef = useRef(resolvePermissions);

  useEffect(() => {
    resolvePermissionsRef.current(userPermissions);
  }, [userPermissions, dispatch]);

  return { state, generateMenu: resolvePermissionsRef.current, toggleLoading };
};

export default useMenuSections;
