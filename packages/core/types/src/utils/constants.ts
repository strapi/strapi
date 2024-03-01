import type * as Internal from '../internal';
import type * as UID from '../uid';

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
  UID.ContentType
>;

export type IsComponentRegistryExtended = NotStrictEqual<Internal.UID.Component, UID.Component>;
