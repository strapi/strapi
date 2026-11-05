// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type createPermissionCheckerService from '../services/permission-checker';
import type { Equal, Expect } from './assert.test';
import type { PermissionChecker } from './services';

type Implementation = ReturnType<ReturnType<typeof createPermissionCheckerService>['create']>;

// With strict types, validateInput takes the parameters of the contract.
// can, cannot and requiresEntity are the contract's, action shortcuts included.
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
];
