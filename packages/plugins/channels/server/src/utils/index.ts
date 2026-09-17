import type { ChannelsService } from '../services/channels';
import type { OverridesService } from '../services/overrides';
import type { VisibilityService } from '../services/visibility';

type S = {
  channels: ChannelsService;
  overrides: OverridesService;
  visibility: VisibilityService;
};

const getService = <T extends keyof S>(
  name: T
): S[T] extends (...args: any) => any ? ReturnType<S[T]> : S[T] => {
  return strapi.plugin('channels').service(name);
};

/** Admin user id of the current request, for createdBy/updatedBy stamps. */
const getCurrentUserId = (): number | undefined =>
  (strapi.requestContext.get()?.state as { user?: { id?: number } } | undefined)?.user?.id;

export { getService, getCurrentUserId };
export * from './content-types';
export * from './current-channel';
