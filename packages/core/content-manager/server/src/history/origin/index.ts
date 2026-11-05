import { getAdminUserAuthor } from './authors';
import { isContentManagerRoute } from './content-manager-route';
import type { HistoryOrigin, RequestContext } from './types';

export const resolveHistoryOrigin = (
  requestContext: RequestContext | undefined
): HistoryOrigin | null => {
  if (!requestContext) {
    return null;
  }

  if (isContentManagerRoute(requestContext)) {
    switch (requestContext.state.auth?.strategy?.name) {
      case 'admin':
        return { source: 'admin-panel', author: getAdminUserAuthor(requestContext.state.user) };
      case 'admin-token':
        return { source: 'admin-api', author: getAdminUserAuthor(requestContext.state.user) };
      default:
        return null;
    }
  }

  return null;
};

export type { HistoryOrigin, RequestContext } from './types';
