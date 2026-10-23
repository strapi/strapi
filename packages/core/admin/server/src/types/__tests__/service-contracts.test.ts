import type ceServices from '../../services';
import type eeServices from '../../../../ee/server/src/services';

/**
 * Admin services the runtime loads without a registered contract. The admin registers its CE map
 * under `admin::<name>` and merges the EE map over it, so every name of both maps is a service UID
 * at runtime. A missing contract makes `strapi.service(uid)` resolve to `unknown` with strict
 * types, so this type must stay `never`: `test:ts:back` fails otherwise.
 */
type MissingContracts = Exclude<
  `admin::${keyof typeof ceServices | keyof typeof eeServices}`,
  keyof Strapi.Registries.PackageServices
>;

const missingContracts: [MissingContracts] extends [never] ? [] : [MissingContracts] = [];

describe('Admin service contracts', () => {
  test('every admin service has a registered contract (checked by the compiler)', () => {
    expect(missingContracts).toEqual([]);
  });
});
