// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Schema, Struct } from '@strapi/types';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type ContentTypeContract = Strapi.Registries.PackageServices['admin::content-type'];

type NestedFields = ContentTypeContract['getNestedFields'];
type NestedFieldsWithIntermediate = ContentTypeContract['getNestedFieldsWithIntermediate'];
type PermissionsWithNestedFields = ContentTypeContract['getPermissionsWithNestedFields'];

type ComponentsOption<TOptions> = NonNullable<
  NonNullable<TOptions> extends { components?: infer C } ? C : never
>;

type SchemaModel = Struct.ContentTypeSchema | Struct.ComponentSchema;

// With strict types, the field helpers of the registered contract read the component registry
// (every caller passes `strapi.components`, and the recursion its own map), and walk component
// schemas as well as content-type schemas (the recursion passes `components[attr.component]`).
export type ContentTypeImplementationAssertions = [
  Expect<Equal<[ComponentsOption<Parameters<NestedFields>[1]>], [Schema.Components]>>,
  Expect<
    Equal<[ComponentsOption<Parameters<NestedFieldsWithIntermediate>[1]>], [Schema.Components]>
  >,
  Expect<
    Equal<[ComponentsOption<Parameters<PermissionsWithNestedFields>[1]>], [Schema.Components]>
  >,
  Expect<Equal<[Parameters<NestedFields>[0]], [SchemaModel]>>,
  Expect<Equal<[Parameters<NestedFieldsWithIntermediate>[0]], [SchemaModel]>>,
];
