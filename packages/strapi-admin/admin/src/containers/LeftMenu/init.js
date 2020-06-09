import { get, omit, set, sortBy } from 'lodash';

const sortLinks = links => sortBy(links, object => object.name);

const init = (initialState, plugins = {}) => {
  const pluginsLinks = Object.values(plugins).reduce((acc, current) => {
    const pluginsSectionLinks = get(current, 'menu.pluginsSectionLinks', []);

    return [...acc, ...pluginsSectionLinks];
  }, []);
  const sortedLinks = sortLinks(pluginsLinks).map(link => {
    return { ...omit(link, 'name'), isDisplayed: false };
  });

  if (sortedLinks.length) {
    set(initialState, 'pluginsSectionLinks', sortedLinks);
  }

  return initialState;
};

export default init;
export { sortLinks };
