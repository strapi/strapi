import type { Data } from '@strapi/types';

import type { RequestContext } from './types';
import type { HistoryVersionActor } from '../../../shared/contracts/history-versions';

interface ContentApiTokenAuth {
  strategy: { name: 'content-api-token' };
  credentials: { id: Data.ID; name: string };
}

interface UsersPermissionsAuth {
  strategy: { name: 'users-permissions' };
  credentials: { id: Data.ID; username: string } | null;
}

interface HistoryAuthor {
  actor: HistoryVersionActor;
  createdBy?: Data.ID;
}

const isContentApiTokenAuth = (auth?: {
  strategy?: { name: string };
}): auth is ContentApiTokenAuth => auth?.strategy?.name === 'content-api-token';

const isUsersPermissionsAuth = (auth?: {
  strategy?: { name: string };
}): auth is UsersPermissionsAuth => auth?.strategy?.name === 'users-permissions';

export const resolveHistoryAuthor = (
  requestContext: RequestContext | undefined
): HistoryAuthor | undefined => {
  if (!requestContext) {
    return undefined;
  }

  const { auth, user } = requestContext.state;

  if (isContentApiTokenAuth(auth)) {
    const { id, name } = auth.credentials;

    return { actor: { type: 'api-token', token: { id, name } } };
  }

  if (isUsersPermissionsAuth(auth)) {
    const { credentials } = auth;

    return {
      actor: credentials
        ? { type: 'end-user', user: { id: credentials.id, username: credentials.username } }
        : { type: 'unknown' },
    };
  }

  return user
    ? { actor: { type: 'admin-user' }, createdBy: user.id }
    : { actor: { type: 'unknown' } };
};
