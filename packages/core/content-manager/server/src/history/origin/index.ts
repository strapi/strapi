import { toAdminUserAuthor } from '../services/utils';
import type { HistoryOrigin, RequestContext } from './types';

const isContentManagerRoute = ({ state }: RequestContext) =>
  state.route?.info?.pluginName === 'content-manager' && state.route?.info?.type === 'admin';

export const resolveHistoryOrigin = (
  requestContext: RequestContext | undefined
): HistoryOrigin | null => {
  if (!requestContext) {
    return null;
  }

  if (isContentManagerRoute(requestContext)) {
    switch (requestContext.state.auth?.strategy?.name) {
      case 'admin':
        return { source: 'admin-panel', author: toAdminUserAuthor(requestContext.state.user) };
      case 'admin-token':
        return { source: 'admin-api', author: toAdminUserAuthor(requestContext.state.user) };
      default:
        return null;
    }
  }

  return null;
};

export type { HistoryOrigin, RequestContext } from './types';
