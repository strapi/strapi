import Loadable from 'react-loadable';

import { LoadingIndicator } from 'strapi-helper-plugin';

export default Loadable({
  loader: () => import('./index'),
  loading: LoadingIndicator,
});
