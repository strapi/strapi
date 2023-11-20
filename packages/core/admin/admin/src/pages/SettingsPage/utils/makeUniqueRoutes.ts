import { MenuItem } from '@strapi/helper-plugin';

interface UniqueRouteProps
  extends Pick<MenuItem, 'to' | 'exact'>,
    Required<Pick<MenuItem, 'Component'>> {
  key: string;
}

export function makeUniqueRoutes(routes: UniqueRouteProps[]) {
  return routes.filter(
    (route, index, refArray) => refArray.findIndex((obj) => obj.key === route.key) === index
  );
}
