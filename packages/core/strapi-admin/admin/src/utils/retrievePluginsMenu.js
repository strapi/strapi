import { get } from 'lodash';

const retrievePluginsMenu = pluginsObj => {
  return Object.values(pluginsObj).reduce((acc, current) => {
    const pluginMenu = get(current, ['settings', 'menuSection'], null);

    if (!pluginMenu) {
      return acc;
    }

    acc.push(pluginMenu);

    return acc;
  }, []);
};

export default retrievePluginsMenu;
