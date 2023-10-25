import { TModule } from '../../../utils/createRoute';

interface UniqueRouteProps {
  key: string;
  Component: TModule;
  to: string;
  exact?: boolean;
}

export function makeUniqueRoutes(routes: UniqueRouteProps[]) {
  return routes.filter(
    (route, index, refArray) => refArray.findIndex((obj) => obj.key === route.key) === index
  );
}
