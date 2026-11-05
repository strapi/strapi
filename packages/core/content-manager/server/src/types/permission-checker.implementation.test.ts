// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type createPermissionCheckerService from '../services/permission-checker';
import type { Equal, Expect } from './assert.test';
import type { PermissionChecker } from './services';

type Implementation = ReturnType<ReturnType<typeof createPermissionCheckerService>['create']>;

// With strict types, validateInput takes the parameters of the contract.
// can, cannot and requiresEntity are the contract's, action shortcuts included.
// The sanitizers are the contract's: sanitizeQuery and sanitizedQuery take any query, and
// sanitizedQuery also takes the action as a string (the v4 signature).
export type PermissionCheckerImplementationAssertions = [
  Expect<
    Equal<
      Parameters<Implementation['validateInput']>,
      Parameters<PermissionChecker['validateInput']>
    >
  >,
  Expect<Equal<Implementation['can'], PermissionChecker['can']>>,
  Expect<Equal<Implementation['cannot'], PermissionChecker['cannot']>>,
  Expect<Equal<Implementation['requiresEntity'], PermissionChecker['requiresEntity']>>,
  Expect<Equal<Implementation['sanitizeOutput'], PermissionChecker['sanitizeOutput']>>,
  Expect<
    Equal<
      Parameters<Implementation['sanitizeQuery']>,
      Parameters<PermissionChecker['sanitizeQuery']>
    >
  >,
  Expect<
    Equal<
      Awaited<ReturnType<Implementation['sanitizeQuery']>>,
      Awaited<ReturnType<PermissionChecker['sanitizeQuery']>>
    >
  >,
  Expect<Equal<Implementation['sanitizeCreateInput'], PermissionChecker['sanitizeCreateInput']>>,
  Expect<Equal<Implementation['sanitizeUpdateInput'], PermissionChecker['sanitizeUpdateInput']>>,
  Expect<Equal<Parameters<Implementation['sanitizedQuery']>[0], unknown>>,
  Expect<
    Equal<
      Awaited<ReturnType<Implementation['sanitizedQuery']>>,
      Awaited<ReturnType<PermissionChecker['sanitizedQuery']>>
    >
  >,
  Expect<
    Equal<Implementation['sanitizedQuery']['read'], PermissionChecker['sanitizedQuery']['read']>
  >,
];
