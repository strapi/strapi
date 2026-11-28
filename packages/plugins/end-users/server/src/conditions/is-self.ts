import type { Modules } from '@strapi/types';

import { USER_UID } from '../constants';

type ContentApiConditionDefinition = Modules.ContentAPI.ContentApiConditionDefinition;

/**
 * `plugin::end-users.is-self`: the end user who is the caller, on the end-user type only. It locks
 * the identity fields, which change only through Better Auth's own endpoints: `email`
 * through `/change-email`, which verifies the new address, and `username` through `/update-user`,
 * which applies the username plugin's rules.
 */
export const isSelf = {
  name: 'plugin::end-users.is-self',
  displayName: 'Is self',
  subjects: [USER_UID],
  query: { documentId: { $eq: '$user.documentId' } },
  lockedFields: () => ['email', 'username'],
  source: 'builtin',
} satisfies ContentApiConditionDefinition;
