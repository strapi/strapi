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
        return { source: 'admin-panel' };
      case 'admin-token':
        return { source: 'admin-api' };
      default:
        return null;
    }
  }

  return null;
};

export type { HistoryOrigin, RequestContext } from './types';
