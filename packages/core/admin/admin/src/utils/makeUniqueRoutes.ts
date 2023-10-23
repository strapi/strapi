import { RouteProps } from 'react-router-dom';

interface UniqueRouteProps extends RouteProps {
  key: string;
}

export function makeUniqueRoutes(routes: UniqueRouteProps[]) {
  return routes.filter(
    (route, index, refArray) => refArray.findIndex((obj) => obj.key === route.key) === index
  );
}
