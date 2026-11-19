import type * as UID from '../../../uid';
import type { Modules } from '../../..';
import type { Equal, Expect } from '../../../../tests/helpers/assert';

// With strict types, the values of a document whose schema is not registered are `unknown`, and so
// are the input values of an unregistered content type. Component inputs keep their values.

type IsAny<T> = 0 extends 1 & T ? true : false;
type AnyDocument = Modules.Documents.AnyDocument;
type Input<TUID extends UID.Schema> = Modules.Documents.Params.Data.Input<TUID>;
type Middleware = Modules.Documents.Middleware.Middleware;
type MiddlewareResult = Awaited<ReturnType<Middleware>>;

declare const documentChecks: [
  Expect<Equal<AnyDocument[string], unknown>>,
  // The ids keep their types.
  Expect<Equal<AnyDocument['documentId'], string>>,
  Expect<Equal<IsAny<AnyDocument['id']>, false>>,
  // Documents of an unregistered UID fall back to it.
  Expect<Equal<Modules.Documents.Document<'api::unregistered.unregistered'>, AnyDocument>>,
];
documentChecks satisfies unknown;

declare const inputChecks: [
  Expect<Equal<Input<UID.ContentType>[string], unknown>>,
  // Component inputs keep develop's values.
  Expect<Equal<IsAny<Input<UID.Component>[string]>, true>>,
];
inputChecks satisfies unknown;

declare const middlewareChecks: [
  // `next()` and the middleware resolve to the union of the action results, with no `any`.
  Expect<Equal<IsAny<MiddlewareResult>, false>>,
  Expect<Equal<Extract<MiddlewareResult, AnyDocument>[string], unknown>>,
];
middlewareChecks satisfies unknown;

// A value read from a document must be narrowed before use.
declare const document: AnyDocument;
// @ts-expect-error `unknown` is not a string.
document.title satisfies string;
if (typeof document.title === 'string') {
  document.title satisfies string;
}
// The input of an unregistered content type still accepts any value.
({ title: 'Title', count: 1, tags: [1, 2] }) satisfies Input<UID.ContentType>;
