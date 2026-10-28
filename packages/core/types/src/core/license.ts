/** A feature of the license inventory, `Strapi.Registries.LicenseFeatures`. */
export type LicenseFeatureName = Extract<keyof Strapi.Registries.LicenseFeatures, string>;

/**
 * What a license-gated contract depends on: a feature name, or `'licensed'` for code that runs with
 * any license that verifies at boot, whatever its features (the admin EE edition, seats).
 */
export type LicenseGate = LicenseFeatureName | 'licensed';

/** The gates the application lists in `Strapi.Registries.LicensedFeatures`. */
type ListedGate = Extract<keyof Strapi.Registries.LicensedFeatures, string>;

/**
 * What the program knows about the license it runs with:
 * - `'declared'`: an application whose type generation wrote `Settings.licenses: 'declared'`, with
 *   strict types. It runs with the gates it lists in `LicensedFeatures`, and only those.
 * - `'unknown'`: any other program, such as a package, a plugin, or an application without the
 *   marker. One compiled package runs under every license.
 */
export type LicenseScope = Strapi.Registries.Settings extends { licenses: 'declared' }
  ? 'declared'
  : 'unknown';

/** Every listed feature implies `'licensed'`: features are empty unless a license verifies. */
type IsListed<TGate extends LicenseGate> = [TGate] extends ['licensed']
  ? [ListedGate] extends [never]
    ? false
    : true
  : [TGate] extends [ListedGate]
    ? true
    : false;

/**
 * Whether the contracts behind `TGate` exist in this program: `'on'` and `'off'` in a declared
 * scope, from the listed gates, `'unknown'` otherwise. See {@link LicenseScope}.
 */
export type LicenseState<TGate extends LicenseGate> = LicenseScope extends 'declared'
  ? IsListed<TGate> extends true
    ? 'on'
    : 'off'
  : 'unknown';

/**
 * A contract that Strapi registers only when the license that verifies at boot lists `TGate`:
 * `T` when the application lists the gate, `undefined` when it does not, `T | undefined` in a
 * program that does not declare its license scope. A later license change does not register or
 * remove it. Never `never`, which would hide misuses.
 *
 * Wrap a gated registry entry, e.g.
 * `'plugin::review-workflows.workflows': Core.Licensed<'review-workflows', WorkflowsService>`.
 */
export type Licensed<TGate extends LicenseGate, T> =
  LicenseState<TGate> extends 'on'
    ? T
    : LicenseState<TGate> extends 'off'
      ? undefined
      : T | undefined;

/**
 * A contract whose EE edition, merged when any license verifies at boot (`'licensed'`), adds or
 * replaces members of the CE contract `TCE` with those of `TEE`: the EE shape when the application
 * lists a gate, the CE shape when it lists none, and the CE shape with the EE-only members optional
 * in a program that does not declare its license scope.
 */
export type LicensedExtension<TCE, TEE> =
  LicenseState<'licensed'> extends 'on'
    ? Omit<TCE, keyof TEE> & TEE
    : LicenseState<'licensed'> extends 'off'
      ? TCE
      : TCE & Partial<Omit<TEE, keyof TCE>>;
