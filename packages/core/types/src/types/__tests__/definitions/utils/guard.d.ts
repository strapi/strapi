import { Utils } from '../../..';

// Never Guard
type NeverGuardGetsNeverWithDefaultFallback = Utils.Guard.Never<never>;
type NeverGuardGetsNeverWithCustomFallback = Utils.Guard.Never<never, string>;
type NeverGuardGetsAny = Utils.Guard.Never<any>;
type NeverGuardGetsUnknown = Utils.Guard.Never<unknown>;
type NeverGuardGetsNull = Utils.Guard.Never<null>;
type NeverGuardGetsUndefined = Utils.Guard.Never<undefined>;

// OfTypes
// Single Type
type OfTypesNeverGetsNeverWithFallback = Utils.Guard.OfTypes<[never], never, string>;
type OfTypesNeverGetsNeverWithoutFallback = Utils.Guard.OfTypes<[never], never>;
type OfTypesUndefined = Utils.Guard.OfTypes<[undefined], undefined>;
type OfTypesUndefinedGetsString = Utils.Guard.OfTypes<[undefined], string>;
type OfTypesNull = Utils.Guard.OfTypes<[null], null>;
type OfTypesNullGetsString = Utils.Guard.OfTypes<[null], string>;
type OfTypesUnknown = Utils.Guard.OfTypes<[unknown], unknown, null>;
type OfTypesUnknownGetString = Utils.Guard.OfTypes<[unknown], string>;
type OfTypeUnionGetsMatchingUnion = Utils.Guard.OfTypes<[string | number], string | number>;
type OfTypeUnionGetsUnionElement = Utils.Guard.OfTypes<[string | number], string>;
// OfTypes<[any]> catches any given value
type OfTypesAnyGetsAny = Utils.Guard.OfTypes<[any], any>;
type OfTypesAnyGetsString = Utils.Guard.OfTypes<[any], string>;

// Multiple Types

type OfTypesStringAndNumberGetsString = Utils.Guard.OfTypes<[string, number], string>;
type OfTypesStringAndNumberGetsNumber = Utils.Guard.OfTypes<[string, number], string>;
type OfTypesStringAndNumberGetsUnionOfStringNumber = Utils.Guard.OfTypes<
  [string, number],
  string | number
>;
type OfTypesStringAndNumberGetsBoolean = Utils.Guard.OfTypes<[string, number], boolean>;

export {
  // Never
  NeverGuardGetsNeverWithDefaultFallback,
  NeverGuardGetsNeverWithCustomFallback,
  NeverGuardGetsAny,
  NeverGuardGetsUnknown,
  NeverGuardGetsNull,
  NeverGuardGetsUndefined,
  // OfTypes
  // Single Type
  OfTypesNeverGetsNeverWithFallback,
  OfTypesNeverGetsNeverWithoutFallback,
  OfTypesAnyGetsAny,
  OfTypesAnyGetsString,
  OfTypesUndefined,
  OfTypesUndefinedGetsString,
  OfTypesNull,
  OfTypesNullGetsString,
  OfTypesUnknown,
  OfTypesUnknownGetString,
  OfTypeUnionGetsMatchingUnion,
  OfTypeUnionGetsUnionElement,
  // Multiple Types
  OfTypesStringAndNumberGetsString,
  OfTypesStringAndNumberGetsNumber,
  OfTypesStringAndNumberGetsUnionOfStringNumber,
  OfTypesStringAndNumberGetsBoolean,
};
