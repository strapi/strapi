import Loadable from 'react-loadable';

import LoadingIndicator from '../LoadingIndicator';

export default Loadable({
  loader: () => import('./index'),
  loading: LoadingIndicator,
});
