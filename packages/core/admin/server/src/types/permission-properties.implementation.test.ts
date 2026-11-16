// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Permission } from '../../../shared/contracts/shared';
import type { CeilingPermission } from '../domain/permission/ceiling';
import { getProperty } from '../domain/permission';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

declare const permission: Permission;
const propertyValue = getProperty('fields', permission);

type Properties = Permission['properties'];
type CeilingProperties = NonNullable<CeilingPermission['properties']>;

// With strict types, a permission's extra properties are unknown, while `fields` and `locales`
// keep their types. `getProperty` reads one property value, so its result is unknown too.
export type PermissionPropertiesImplementationAssertions = [
  Expect<Equal<[Properties[string]], [unknown]>>,
  Expect<Equal<[Properties['fields']], [string[] | undefined]>>,
  Expect<Equal<[Properties['locales']], [string[] | null | undefined]>>,
  Expect<Equal<[CeilingProperties[string]], [unknown]>>,
  Expect<Equal<[typeof propertyValue], [unknown]>>,
];
