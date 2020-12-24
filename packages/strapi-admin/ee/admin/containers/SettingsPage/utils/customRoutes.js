import { SETTINGS_BASE_URL } from '../../../../../admin/src/config';
import SingleSignOn from '../SingleSignOn';

const customRoutes = [
  {
    Component: SingleSignOn,
    to: `${SETTINGS_BASE_URL}/single-sign-on`,
    exact: true,
  },
];

export default customRoutes;
