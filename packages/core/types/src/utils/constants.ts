import type * as Internal from '../internal';
import type * as Public from '../public';

import type { Or, NotStrictEqual } from '../utils';

export type True = true;

export type False = false;

export type BooleanValue = True | False;

export type AreSchemaRegistriesExtended = Or<
  IsComponentRegistryExtended,
  IsContentTypeRegistryExtended
>;

export type IsContentTypeRegistryExtended = NotStrictEqual<
  Internal.UID.ContentType,
  Public.UID.ContentType
>;

export type IsComponentRegistryExtended = NotStrictEqual<
  Internal.UID.Component,
  Public.UID.Component
>;
