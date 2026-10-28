import type { Core } from '@strapi/types';
import type ceControllers from '../../controllers';
import type { Controllers } from '../controllers';

/**
 * CE admin controllers the runtime loads without a registered contract. The admin registers its
 * controllers map under `admin::<name>`. A missing contract makes `strapi.controller(uid)` resolve
 * to `unknown` with strict types, so this type must stay `never`: `test:ts:back` fails otherwise.
 */
type MissingContracts = Exclude<
  `admin::${keyof typeof ceControllers}`,
  keyof Strapi.Registries.PackageControllers
>;

/**
 * The controllers of `TControllers` whose action names differ from their contract, with the drift.
 * The map's `satisfies` check misses an extra action, because its values are not object literals.
 */
type ActionDrift<TControllers> = {
  [
    TName in keyof TControllers & keyof Controllers as Core.SameNames<
      keyof TControllers[TName],
      keyof Controllers[TName]
    > extends true
      ? never
      : TName
  ]: Core.SameNames<keyof TControllers[TName], keyof Controllers[TName]>;
};

const missingContracts: [MissingContracts] extends [never] ? [] : [MissingContracts] = [];

// `transfer` prefixes its action names at runtime: `controllers/transfer` checks them.
const actionDrift: ActionDrift<Omit<typeof ceControllers, 'transfer'>> = {};

// @ts-expect-error A contract action the controller does not implement is drift.
const missingAction: ActionDrift<{ user: Omit<Controllers['user'], 'create'> }> = {};

// @ts-expect-error A controller action without a contract is drift.
const extraAction: ActionDrift<{ user: Controllers['user'] & { extra: Core.ControllerHandler } }> =
  {};

describe('Admin controller contracts', () => {
  test('every CE admin controller has a registered contract (checked by the compiler)', () => {
    expect(missingContracts).toEqual([]);
  });

  test('every CE admin controller implements the actions of its contract (checked by the compiler)', () => {
    expect(actionDrift).toEqual({});
    expect([missingAction, extraAction]).toEqual([{}, {}]);
  });
});
