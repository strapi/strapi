import type { Data } from '@strapi/types';

import type { HistoryVersionAuthor } from '../../../../shared/contracts/history-versions';

export interface AdminUser {
  id: Data.ID;
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  email: string;
}

const getAdminUserName = ({ username, firstname, lastname, email }: AdminUser) => {
  if (username) {
    return username;
  }

  if (firstname) {
    return `${firstname} ${lastname ?? ''}`.trim();
  }

  return email;
};

export const getAdminUserAuthor = (user: AdminUser): HistoryVersionAuthor => ({
  type: 'person',
  name: getAdminUserName(user),
  model: 'admin::user',
  id: String(user.id),
});
