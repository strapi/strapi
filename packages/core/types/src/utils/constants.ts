import type * as Internal from '../internal';
import type * as UID from '../uid';

import type { NotStrictEqual, Or } from '.';

export type True = true;

export type False = false;

export type BooleanValue = True | False;

/**
 * Determine if there's been an extension or change in either Component Registry or Content-Type Registry.
 *
 * It applies the compound boolean OR operation on the results derived from {@link IsComponentRegistryExtended} and {@link IsContentTypeRegistryExtended}.
 *
 * If either or both results are true (indicating a change or extension in the corresponding registry), it returns {@link True}; otherwise, it returns {@link False}.
 *
 * @example
 * ```typescript
 * // A change or extension in both the Component Registry and the Content-Type Registry
 * type Example1 = AreSchemaRegistriesExtended; // Result: Constants.True
 *
 * // A change or extension only in the Component Registry
 * type Example2 = IsComponentRegistryExtended; // Result: Constants.True
 *
 * // A change or extension only in the Content-Type Registry
 * type Example3 = IsContentTypeRegistryExtended; // Result: Constants.True

 * // No change or extension in either registries
 * type Example4 = AreSchemaRegistriesExtended; // Result: Constants.False
 * ```
 *
 * @see IsComponentRegistryExtended
 * @see IsContentTypeRegistryExtended
 */
export type AreSchemaRegistriesExtended = Or<
  IsComponentRegistryExtended,
  IsContentTypeRegistryExtended
>;

/**
 * Evaluate if the internal UIDs ({@link Internal.UID.ContentType}) and public ones ({@link UID.ContentType}) are not identical.
 *
 * If these two types are not the same, it indicates an extension or change has occurred in the public Content-Type Registry.
 *
 * The type leverages {@link NotStrictEqual} to perform this comparison accurately. The result is a type-level
 * boolean that denotes whether there is a deviation between the two Content-Type representations.
 *
 * @returns Either [Constants.True](@link Constants.True) if the Content-Type Registry has been extended, else [Constants.False](@link Constants.False).
 *
 * @remark
 * This type is particularly useful when there is a need to verify whether there have been extensions or changes to the Content-Type Registry
 * after initially creating it.
 *
 * It allows developers to perform this check at the type level and decide what type should be resolved depending on the context
 */
export type IsContentTypeRegistryExtended = NotStrictEqual<
  Internal.UID.ContentType,
  UID.ContentType
>;

/**
 * Evaluate if the internal UIDs ({@link Internal.UID.Component}) and public ones ({@link UID.Component}) are not identical.
 *
 * If these two types are not the same, it indicates an extension or change has occurred in the public Component Registry.
 *
 * The type leverages {@link NotStrictEqual} to perform this comparison accurately. The result is a type-level
 * boolean that denotes whether there is a deviation between the two Content-Type representations.
 *
 * @return - Either {@link True} if the Component Registry has been extended, else {@link False}.
 *
 * @remark
 * This type is particularly useful when there is a need to verify whether there have been extensions or changes to the Component Registry
 * after initially creating it.
 *
 * It allows developers to perform this check at the type level and decide what type should be resolved depending on the context
 */
export type IsComponentRegistryExtended = NotStrictEqual<Internal.UID.Component, UID.Component>;
