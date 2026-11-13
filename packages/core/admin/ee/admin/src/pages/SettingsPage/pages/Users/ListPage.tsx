import { ListPageCE } from '../../../../../../../admin/src/pages/Settings/pages/Users/ListPage';
import { useLicenseLimitNotification } from '../../../../hooks/useLicenseLimitNotification';

import { LicenseUsageBanner } from './components/LicenseUsageBanner';

export const UserListPageEE = () => {
  useLicenseLimitNotification();

  return <ListPageCE banner={<LicenseUsageBanner />} />;
};
