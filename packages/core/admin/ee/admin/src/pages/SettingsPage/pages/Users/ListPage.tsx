import { ListPageCE } from '../../../../../../../admin/src/pages/Settings/pages/Users/ListPage';
import { useLicenseLimitNotification } from '../../../../hooks/useLicenseLimitNotification';

export const UserListPageEE = () => {
  useLicenseLimitNotification();

  return <ListPageCE />;
};
