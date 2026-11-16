// Compile-only assertions. The EE server tsconfig includes this file; declaration builds exclude it.
import type { Data } from '@strapi/types';
import type CEAuthService from '../../../../server/src/services/auth';
import type CEUserService from '../../../../server/src/services/user';
import type { EnterpriseContracts } from '../../../../server/src/types';
import type EEAuthService from '../services/auth';
import type EEPersistTablesService from '../services/persist-tables';
import type EERoleService from '../services/role';
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

// With strict types, the registered contracts give the EE members that the implementation cannot
// type without a cast the CE member's parameters. `ssoCheckRolesIdForDeletion` has no CE twin: its
// callers pass the IDs of the roles to delete (`validation/role.ts:33`, `:58`), and the body iterates
// them. The results stay the implementation's.
export type EEContractAssertions = [
  Expect<
    Equal<
      [Parameters<EnterpriseContracts['auth']['forgotPassword']>],
      [Parameters<typeof CEAuthService.forgotPassword>]
    >
  >,
  Expect<
    Equal<
      [ReturnType<EnterpriseContracts['auth']['forgotPassword']>],
      [ReturnType<typeof EEAuthService.forgotPassword>]
    >
  >,
  Expect<
    Equal<
      [Parameters<EnterpriseContracts['auth']['resetPassword']>],
      [Parameters<typeof CEAuthService.resetPassword>]
    >
  >,
  Expect<
    Equal<
      [ReturnType<EnterpriseContracts['auth']['resetPassword']>],
      [ReturnType<typeof EEAuthService.resetPassword>]
    >
  >,
  Expect<Equal<[Parameters<EnterpriseContracts['user']['updateById']>], [CEUpdateByIdParameters]>>,
  Expect<
    Equal<
      [ReturnType<EnterpriseContracts['user']['updateById']>],
      [ReturnType<typeof EEUserService.updateById>]
    >
  >,
  Expect<
    Equal<
      [Parameters<EnterpriseContracts['role']['ssoCheckRolesIdForDeletion']>],
      [[ids: Data.ID[]]]
    >
  >,
  Expect<
    Equal<
      [ReturnType<EnterpriseContracts['role']['ssoCheckRolesIdForDeletion']>],
      [ReturnType<typeof EERoleService.ssoCheckRolesIdForDeletion>]
    >
  >,
];
