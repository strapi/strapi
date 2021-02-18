import { get } from 'lodash';
import createRoute from './createRoute';

const retrieveRoutes = links => links.filter(link => typeof link.Component === 'function');

const createPluginsLinksRoutes = menu => {
  return menu.reduce((acc, current) => {
    // The global links are handled by another util
    if (current.id === 'global') {
      return acc;
    }

    const filteredLinks = retrieveRoutes(get(current, 'links', []));
    const routes = filteredLinks.map(link => {
      return createRoute(link.Component, link.to, link.exact);
    });

    return [...acc, ...routes];
  }, []);
};

export default createPluginsLinksRoutes;
export { retrieveRoutes };
