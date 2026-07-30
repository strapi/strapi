import type { ContentTypesService } from '../services/content-types';
import type { MoveService } from '../services/move';
import type { SpacesService } from '../services/spaces';
import type { VisibilityService } from '../services/visibility';

type S = {
  ['content-types']: ContentTypesService;
  move: MoveService;
  spaces: SpacesService;
  visibility: VisibilityService;
};

const getService = <T extends keyof S>(
  name: T
): S[T] extends (...args: any) => any ? ReturnType<S[T]> : S[T] => {
  return strapi.plugin('spaces').service(name);
};

export { getService };
