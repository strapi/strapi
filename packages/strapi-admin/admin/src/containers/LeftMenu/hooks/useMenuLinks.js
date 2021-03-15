import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import init from '../init';
import { initialState } from '../reducer';
import { useSettingsMenu } from '../../../hooks';

const useMenuLinks = (plugins, shouldUpdateStrapi) => {
  const {
    collectionTypesSectionLinks,
    generalSectionLinks,
    isLoading,
    pluginsSectionLinks,
    singleTypesSectionLinks,
  } = useSelector(state => state.get('menuLinks'));
  const { menu: settingsMenu } = useSettingsMenu(true);

  useEffect(() => {
    // TODO: this needs to be added to the settings API in the v4
    const settingsLinkNotificationCount = () => {
      if (shouldUpdateStrapi) {
        return 1;
      }

      return 0;
    };

    init(initialState, plugins, settingsMenu, settingsLinkNotificationCount);
  }, [shouldUpdateStrapi, settingsMenu, plugins]);

  return {
    collectionTypesSectionLinks,
    generalSectionLinks,
    isLoading,
    pluginsSectionLinks,
    singleTypesSectionLinks,
  };
};

export default useMenuLinks;
