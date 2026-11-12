// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type createStagePermissionsService from '../services/stage-permissions';
import type { Equal, Expect } from './assert.test';
import type { StagePermissionsService } from './services';

type Implementation = ReturnType<typeof createStagePermissionsService>;

type IsAny<T> = 0 extends 1 & T ? true : false;

// The members take the parameters of the contract.
export type StagePermissionsImplementationAssertions = [
  Expect<
    Equal<Parameters<Implementation['register']>, Parameters<StagePermissionsService['register']>>
  >,
  Expect<
    Equal<
      Parameters<Implementation['registerTo']>,
      Parameters<StagePermissionsService['registerTo']>
    >
  >,
  Expect<
    Equal<
      Parameters<Implementation['registerMany']>,
      Parameters<StagePermissionsService['registerMany']>
    >
  >,
  Expect<
    Equal<
      Parameters<Implementation['registerManyTo']>,
      Parameters<StagePermissionsService['registerManyTo']>
    >
  >,
  Expect<
    Equal<
      Parameters<Implementation['unregister']>,
      Parameters<StagePermissionsService['unregister']>
    >
  >,
  Expect<
    Equal<
      Parameters<Implementation['canTransitionToStage']>,
      Parameters<StagePermissionsService['canTransitionToStage']>
    >
  >,
  // `register` and `registerTo` resolve to `any` with strict types too: the admin `addPermissions`
  // declares `Permission[]`, wider than the contract's `RegisteredStagePermission`.
  Expect<IsAny<Awaited<ReturnType<Implementation['register']>>>>,
  Expect<IsAny<Awaited<ReturnType<Implementation['registerTo']>>>>,
];
