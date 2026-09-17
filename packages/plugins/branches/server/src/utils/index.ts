import type { BranchesService } from '../services/branches';
import type { ChangesService } from '../services/changes';
import type { DiffService } from '../services/diff';
import type { MergeService } from '../services/merge';
import type { ResolveService } from '../services/resolve';

type S = {
  branches: BranchesService;
  changes: ChangesService;
  diff: DiffService;
  merge: MergeService;
  resolve: ResolveService;
};

const getService = <T extends keyof S>(
  name: T
): S[T] extends (...args: any) => any ? ReturnType<S[T]> : S[T] => {
  return strapi.plugin('branches').service(name);
};

/** Admin user id of the current request, for createdBy/updatedBy stamps. */
const getCurrentUserId = (): number | undefined =>
  (strapi.requestContext.get()?.state as { user?: { id?: number } } | undefined)?.user?.id;

export { getService, getCurrentUserId };
export * from './content-types';
export * from './current-branch';
