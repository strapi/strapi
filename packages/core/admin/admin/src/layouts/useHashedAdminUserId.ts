import * as React from 'react';

import { hashAdminUserEmail } from '../utils/users';

type AdminUser = Parameters<typeof hashAdminUserEmail>[0];

const useHashedAdminUserId = (user: AdminUser) => {
  const [userId, setUserId] = React.useState<string>();

  React.useEffect(() => {
    let current = true;

    setUserId(undefined);

    void hashAdminUserEmail(user).then((id) => {
      if (current && id) {
        setUserId(id);
      }
    });

    return () => {
      current = false;
    };
  }, [user]);

  return userId;
};

export { useHashedAdminUserId };
