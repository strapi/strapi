/**
 * Type-level regression tests, compiled by `yarn test:ts` (tsc -p tsconfig.json).
 * `traverseEntity` and the sanitizer and validator registries accept documents whose values are
 * `unknown`, such as documents read from an unregistered content type. `@ts-expect-error` marks
 * the shapes that must keep failing.
 */
import { traverseEntity, sanitize } from '@strapi/utils';

import type { Modules, Schema } from '../..';

type Assert<T extends true> = T;
type IsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;

declare const schema: Schema.ContentType;
declare const getModel: (uid: string) => Schema.ContentType;
declare const sanitizers: Modules.Sanitizers.SanitizersRegistry;
declare const validators: Modules.Validators.ValidatorsRegistry;

const removeSecret: Parameters<typeof traverseEntity>[0] = ({ key, value }, { remove, set }) => {
  // A visitor reads `value` as `unknown` and can `set` any value.
  true satisfies Assert<IsEqual<typeof value, unknown>>;
  true satisfies Assert<IsEqual<typeof set, (key: string, value: unknown) => void>>;

  if (key === 'secret') {
    remove(key);
  }

  if (key === 'author' && value !== null && typeof value === 'object') {
    // A visitor can store any value, for example a document with `unknown` values.
    set(key, { ...value, documentId: 'abc' });
  }
};

// A document whose values are `unknown` is accepted.
declare const unknownValuedDocument: { documentId: string; id: number } & Record<string, unknown>;
export const traversed = traverseEntity(removeSecret, { schema, getModel }, unknownValuedDocument);
export const sanitized = sanitize.sanitizers.defaultSanitizeOutput(
  { schema, getModel },
  unknownValuedDocument
);

// A JSON-like document is still accepted.
export const traversedJson = traverseEntity(
  removeSecret,
  { schema, getModel },
  { id: 1, title: 'Hello', tags: [{ id: 2, name: 'news' }], publishedAt: new Date() }
);

// The result keeps the traversed values `unknown` and the reserved keys typed.
type Traversed = Awaited<typeof traversed>;
true satisfies Assert<IsEqual<Traversed['title'], unknown>>;
true satisfies Assert<IsEqual<Traversed['__component'], string | undefined>>;

// A partial application is a sanitizer or a validator.
sanitizers.add('content-api.output', (contentType) =>
  traverseEntity(removeSecret, { schema: contentType, getModel })
);
validators.add('content-api.input', (contentType) =>
  traverseEntity(removeSecret, { schema: contentType, getModel })
);

// @ts-expect-error only objects are traversed.
traverseEntity(removeSecret, { schema, getModel }, 'not an entity');
