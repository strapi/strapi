import { useEffect } from 'react';
import { useUser } from 'strapi-helper-plugin';
import { useSelector, useDispatch } from 'react-redux';
import getCtOrStLinks from './utils/getCtOrStLinks';
import getPluginSectionLinks from './utils/getPluginSectionLinks';
import getGeneralLinks from './utils/getGeneralLinks';
import { setCtOrStLinks, setSectionLinks, toggleIsLoading } from './actions';
import useSettingsMenu from '../../hooks/useSettingsMenu';
import toPluginLinks from './utils/toPluginLinks';
import selectMenuLinks from './selectors';

const useMenuSections = (plugins, shouldUpdateStrapi) => {
  const state = useSelector(selectMenuLinks);
  const dispatch = useDispatch();
  const { userPermissions } = useUser();
  const { menu: settingsMenu } = useSettingsMenu(true);

  useEffect(() => {
    const resolvePermissions = async () => {
      const pluginsSectionLinks = toPluginLinks(plugins);
      const { authorizedCtLinks, authorizedStLinks } = await getCtOrStLinks(userPermissions);

      const authorizedPluginSectionLinks = await getPluginSectionLinks(
        userPermissions,
        pluginsSectionLinks
      );

      const authorizedGeneralSectionLinks = await getGeneralLinks(
        userPermissions,
        state.generalSectionLinks,
        settingsMenu,
        shouldUpdateStrapi
      );

      dispatch(setCtOrStLinks(authorizedCtLinks, authorizedStLinks));
      dispatch(setSectionLinks(authorizedGeneralSectionLinks, authorizedPluginSectionLinks));
      dispatch(toggleIsLoading());
    };

    resolvePermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plugins, userPermissions, dispatch]);

  return state;
};

export default useMenuSections;
