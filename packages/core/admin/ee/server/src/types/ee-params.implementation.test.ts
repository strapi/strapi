// Compile-only assertions. The EE server tsconfig includes this file; declaration builds exclude it.
import type CEAuthService from '../../../../server/src/services/auth';
import type CEUserService from '../../../../server/src/services/user';
import type EEAuthService from '../services/auth';
import type EEPersistTablesService from '../services/persist-tables';
import type EEUserService from '../services/user';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type CEUpdateByIdParameters = Parameters<typeof CEUserService.updateById>;

// With strict types, an EE member that replaces a CE member takes the CE member's parameters: the
// same callers reach both editions. EE-only members take what their callers pass.
export type EEParamsImplementationAssertions = [
  Expect<
    Equal<
      [Parameters<typeof EEUserService.deleteByIds>],
      [Parameters<typeof CEUserService.deleteByIds>]
    >
  >,
  Expect<Equal<[Parameters<typeof EEUserService.updateById>[0]], [CEUpdateByIdParameters[0]]>>,
  // `updateById` passes its `id` and `attributes` on.
  Expect<
    Equal<
      [Parameters<typeof EEUserService.updateEEDisabledUsersList>],
      [[id: CEUpdateByIdParameters[0], input: CEUpdateByIdParameters[1]]]
    >
  >,
  // `persistTablesWithPrefix` passes a `RegExp`, and the body calls `regex.test`.
  Expect<Equal<[Parameters<typeof EEPersistTablesService.findTables>[1]], [RegExp]>>,
  // Both editions return the email plugin's `sendTemplatedEmail` result, typed `unknown` by the
  // email contract.
  Expect<Equal<[Awaited<ReturnType<typeof EEAuthService.forgotPassword>>], [unknown]>>,
  Expect<Equal<[Awaited<ReturnType<typeof CEAuthService.forgotPassword>>], [unknown]>>,
];
