import * as React from 'react';

// eslint-disable-next-line import/no-cycle
import { UserListPageCE } from '../../../../../../../admin/src/pages/SettingsPage/pages/Users/ListPage';
import { useLicenseLimitNotification } from '../../../../../hooks/useLicenseLimitNotification';

function UserListPageEE() {
  useLicenseLimitNotification();

  return <UserListPageCE />;
}

export { UserListPageEE };
