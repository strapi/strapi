import type { RequestContext } from './types';

export type HistoryOrigin = 'content-manager' | 'content-api';

interface OriginOptions {
  isContentApiEnabled: boolean;
}

const isContentManagerRoute = ({ state }: RequestContext) =>
  state.route?.info?.pluginName === 'content-manager' && state.route.info.type === 'admin';

const isContentApiRoute = ({ state }: RequestContext) => state.route?.info?.type === 'content-api';

export const resolveHistoryOrigin = (
  requestContext: RequestContext,
  { isContentApiEnabled }: OriginOptions
): HistoryOrigin | null => {
  if (isContentManagerRoute(requestContext)) {
    return 'content-manager';
  }

  if (isContentApiEnabled && isContentApiRoute(requestContext)) {
    return 'content-api';
  }

  return null;
};
