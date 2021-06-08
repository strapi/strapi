import flatMap from 'lodash/flatMap';
import createRoute from './createRoute';

// const retrieveRoutes = links => links.filter(link => typeof link.Component === 'function');

const createSectionsRoutes = settings => {
  const allLinks = flatMap(settings, section => section.links);

  return allLinks.map(link => createRoute(link.Component, link.to, link.exact || false));
};

export default createSectionsRoutes;
// export { retrieveRoutes };
