import type { LicenseGate, LicenseState } from '../core/license';
import type { IsStrict } from '../core/strictness';
import type * as Internal from '../internal';
import type * as Public from '../public';

/**
 * Package entries for the UIDs type generation did not write. Two separate interfaces, so a UID
 * present in both is never a duplicate property: the generated entry wins.
 */
type PackageOnly<TPackage, TGenerated> = Omit<TPackage, keyof TGenerated>;

/**
 * Without generated entries, any content-type UID maps to a generic schema, as without strict
 * mode, and the package entries stay precise. An interface, as {@link Internal.Registry.GenericContentTypeSchemas}.
 */
interface OpenContentTypeSchemas
  extends
    Internal.Registry.GenericContentTypeSchemas,
    Strapi.Registries.PackageContentTypeSchemas {}

type LicensedAttributeEntries = Strapi.Registries.LicensedContentTypeAttributes;

/** The gates of `LicensedContentTypeAttributes` that the program's license scope turns on. */
type LicensedAttributeGate = {
  [TGate in keyof LicensedAttributeEntries]: TGate extends LicenseGate
    ? LicenseState<TGate> extends 'on'
      ? TGate
      : never
    : never;
}[keyof LicensedAttributeEntries];

type UnionToIntersection<TUnion> = (
  TUnion extends unknown ? (value: TUnion) => void : never
) extends (value: infer TIntersection) => void
  ? TIntersection
  : never;

/** The attributes one entry adds to `TSchema`: none when the schema matches an `except` shape. */
type EntryAttributes<TEntry, TSchema> = TEntry extends {
  attributes: infer TAttributes;
  except: infer TExcept;
}
  ? TSchema extends TExcept
    ? never
    : TAttributes
  : never;

/** The attributes the turned-on gates add to `TSchema`, `unknown` when they add none. */
type LicensedAttributes<TSchema> = UnionToIntersection<
  {
    [TGate in LicensedAttributeGate]: EntryAttributes<LicensedAttributeEntries[TGate], TSchema>;
  }[LicensedAttributeGate]
>;

/**
 * Schemas with the attributes of `LicensedContentTypeAttributes` whose gate is on, as the runtime
 * adds them at register. The schemas themselves when no gate is on.
 */
type WithLicensedAttributes<TSchemas> = [LicensedAttributeGate] extends [never]
  ? TSchemas
  : {
      [TUID in keyof TSchemas]: TSchemas[TUID] & {
        attributes: LicensedAttributes<TSchemas[TUID]>;
      };
    };

/**
 * Content-type schemas in strict mode: the generated entries, plus the package entries for the UIDs
 * they do not cover, with the licensed attributes of the application's license scope. Without
 * generated entries, see {@link OpenContentTypeSchemas}.
 */
type StrictContentTypeSchemas = [keyof Strapi.Registries.AppContentTypeSchemas] extends [never]
  ? OpenContentTypeSchemas
  : WithLicensedAttributes<
      PackageOnly<
        Strapi.Registries.PackageContentTypeSchemas,
        Strapi.Registries.AppContentTypeSchemas
      > &
        Strapi.Registries.AppContentTypeSchemas
    >;

/**
 * Generated component schemas in strict mode. Without generated entries, any component UID maps
 * to a generic schema, as without strict mode.
 */
type StrictComponentSchemas = [keyof Strapi.Registries.ComponentSchemas] extends [never]
  ? Internal.Registry.GenericComponentSchemas
  : Strapi.Registries.ComponentSchemas;

/**
 * Content-type schemas keyed by UID: `Public.ContentTypeSchemas` without strict mode,
 * `Strapi.Registries.AppContentTypeSchemas` over `Strapi.Registries.PackageContentTypeSchemas`
 * with it. Strict mode ignores `Public` augmentations.
 */
export type ContentTypeSchemas = IsStrict extends false
  ? Public.ContentTypeSchemas
  : StrictContentTypeSchemas;

/**
 * Component schemas keyed by UID: `Public.ComponentSchemas` without strict mode,
 * `Strapi.Registries.ComponentSchemas` with it. Strict mode ignores `Public` augmentations.
 */
export type ComponentSchemas = IsStrict extends false
  ? Public.ComponentSchemas
  : StrictComponentSchemas;
