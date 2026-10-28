import type { Core } from '@strapi/types';
import type ceControllers from '../../controllers';
import type eeControllers from '../../../../ee/server/src/controllers';
import type auditLogsController from '../../../../ee/server/src/audit-logs/controllers/audit-logs';
import type { Controllers } from '../controllers';
import type { Controllers as EEControllers } from '../../../../ee/server/src/types/controllers';

/**
 * Admin controllers the runtime loads without a registered contract. The admin registers its CE map
 * under `admin::<name>` and merges the EE map over it, so every name of both maps is a controller
 * UID at runtime. A missing contract makes `strapi.controller(uid)` resolve to `unknown` with strict
 * types, so this type must stay `never`: `test:ts:back` fails otherwise.
 */
type MissingContracts = Exclude<
  `admin::${keyof typeof ceControllers | keyof EEControllers}`,
  keyof Strapi.Registries.PackageControllers
>;

/**
 * The controllers of `TControllers` whose action names differ from their contract in `TContracts`,
 * with the drift. The map's `satisfies` check misses an extra action, because its values are not
 * object literals.
 */
type ActionDrift<TControllers, TContracts = Controllers> = {
  [
    TName in keyof TControllers & keyof TContracts as Core.SameNames<
      keyof TControllers[TName],
      keyof TContracts[TName]
    > extends true
      ? never
      : TName
  ]: Core.SameNames<keyof TControllers[TName], keyof TContracts[TName]>;
};

const missingContracts: [MissingContracts] extends [never] ? [] : [MissingContracts] = [];

// `transfer` prefixes its action names at runtime: `controllers/transfer` checks them.
const actionDrift: ActionDrift<Omit<typeof ceControllers, 'transfer'>> = {};

// `getAdminEE()` adds `audit-logs` to the EE map when audit logs are enabled.
const eeActionDrift: ActionDrift<
  typeof eeControllers & { 'audit-logs': typeof auditLogsController },
  EEControllers
> = {};

// @ts-expect-error A contract action the controller does not implement is drift.
const missingAction: ActionDrift<{ user: Omit<Controllers['user'], 'create'> }> = {};

// @ts-expect-error A controller action without a contract is drift.
const extraAction: ActionDrift<{ user: Controllers['user'] & { extra: Core.ControllerHandler } }> =
  {};

// @ts-expect-error An EE action without a contract is drift.
const extraEEAction: ActionDrift<
  { user: EEControllers['user'] & { extra: Core.ControllerHandler } },
  EEControllers
> = {};

describe('Admin controller contracts', () => {
  test('every admin controller has a registered contract (checked by the compiler)', () => {
    expect(missingContracts).toEqual([]);
  });

  test('every CE admin controller implements the actions of its contract (checked by the compiler)', () => {
    expect(actionDrift).toEqual({});
    expect([missingAction, extraAction]).toEqual([{}, {}]);
  });

  test('every EE admin controller implements the actions of its contract (checked by the compiler)', () => {
    expect(eeActionDrift).toEqual({});
    expect(extraEEAction).toEqual({});
  });
});
