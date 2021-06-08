import flatMap from 'lodash/flatMap';
import createRoute from './createRoute';

const createSectionsRoutes = settings => {
  const allLinks = flatMap(settings, section => section.links);

  return allLinks.map(link => createRoute(link.Component, link.to, link.exact || false));
};

export default createSectionsRoutes;
