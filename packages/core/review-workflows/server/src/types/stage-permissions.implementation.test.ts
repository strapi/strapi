// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type createStagePermissionsService from '../services/stage-permissions';
import type { Equal, Expect } from './assert.test';
import type { RegisteredStagePermission, StagePermissionsService } from './services';

type Implementation = ReturnType<typeof createStagePermissionsService>;

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
  // `register` and `registerTo` resolve to the permissions the admin `addPermissions` stored.
  Expect<
    Equal<Awaited<ReturnType<Implementation['register']>>, RegisteredStagePermission<'from'>[]>
  >,
  Expect<
    Equal<Awaited<ReturnType<Implementation['registerTo']>>, RegisteredStagePermission<'to'>[]>
  >,
];
