import * as React from 'react';

import { hashAdminUserEmail } from '../utils/users';

type AdminUser = Parameters<typeof hashAdminUserEmail>[0];

const useHashedAdminUserId = (user: AdminUser) => {
  const email = user?.email;
  const [hashedUser, setHashedUser] = React.useState<{ email?: string; id?: string }>({});

  React.useEffect(() => {
    let current = true;

    setHashedUser({ email });

    void hashAdminUserEmail(user).then((id) => {
      if (current && id) {
        setHashedUser({ email, id });
      }
    });

    return () => {
      current = false;
    };
  }, [email, user]);

  return hashedUser.email === email ? hashedUser.id : undefined;
};

export { useHashedAdminUserId };
