// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { formatAttribute, getSchema } from '../services/schema';
import type { Equal, Expect } from './assert.test';
import type {
  FormattedAttribute,
  SchemaComponent,
  SchemaContentType,
  SchemaService,
} from './services';

type FormatAttributeParameter = Parameters<typeof formatAttribute>[0];
type IsAny<T> = 0 extends 1 & T ? true : false;
type GetSchemaResult = Awaited<ReturnType<typeof getSchema>>;

// With strict types, `formatAttribute` accepts the contract's attribute, read with the optional
// inverse names of non-morph relations, and no `any`.
export type SchemaImplementationAssertions = [
  Expect<
    Equal<
      FormatAttributeParameter,
      Parameters<SchemaService['formatAttribute']>[0] & { inversedBy?: string; mappedBy?: string }
    >
  >,
  Expect<
    Parameters<SchemaService['formatAttribute']>[0] extends FormatAttributeParameter ? true : false
  >,
  Expect<Equal<IsAny<FormatAttributeParameter[keyof FormatAttributeParameter]>, false>>,
];

// The results are the contract's named types, so the published declarations reference them instead
// of inlining every attribute shape (and the `json-logic-js` types of its `conditions`).
export type SchemaResultAssertions = [
  Expect<Equal<ReturnType<typeof formatAttribute>, FormattedAttribute>>,
  Expect<
    Equal<
      GetSchemaResult['contentTypes'][keyof GetSchemaResult['contentTypes']]['attributes'],
      SchemaContentType['attributes']
    >
  >,
  Expect<
    Equal<
      GetSchemaResult['components'][keyof GetSchemaResult['components']]['attributes'],
      SchemaComponent['attributes']
    >
  >,
];
