import type { AccessService } from '../services/access';
import type { ContentTypesService } from '../services/content-types';
import type { InheritanceService } from '../services/inheritance';
import type { LimitsService } from '../services/limits';
import type { MembershipService } from '../services/membership';
import type { MoveService } from '../services/move';
import type { SpacesService } from '../services/spaces';
import type { VisibilityService } from '../services/visibility';

type S = {
  access: AccessService;
  ['content-types']: ContentTypesService;
  inheritance: InheritanceService;
  limits: LimitsService;
  membership: MembershipService;
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
