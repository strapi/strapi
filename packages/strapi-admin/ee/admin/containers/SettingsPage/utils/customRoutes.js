import { SETTINGS_BASE_URL } from '../../../../../admin/src/config';
import SingleSignOn from '../SingleSignOn';

const ssoRoutes = ENABLED_EE_FEATURES.includes('sso')
  ? [
      {
        Component: SingleSignOn,
        to: `${SETTINGS_BASE_URL}/single-sign-on`,
        exact: true,
      },
    ]
  : [];

const customRoutes = [...ssoRoutes];

export default customRoutes;
