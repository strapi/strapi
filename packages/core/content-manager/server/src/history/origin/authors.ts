import type { Data } from '@strapi/types';

import type { HistoryVersionAuthorReference } from '../../../../shared/contracts/history-versions';

export const getAdminUserAuthor = (user: { id: Data.ID }): HistoryVersionAuthorReference => ({
  type: 'person',
  model: 'admin::user',
  id: String(user.id),
});
