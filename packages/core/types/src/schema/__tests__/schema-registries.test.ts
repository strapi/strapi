import type * as Internal from '../../internal';
import type * as Struct from '../../struct';
import type * as UID from '../../uid';
import type { Component, ContentType } from '..';

// Strict mode reads only the global schema registries. Public entries must not narrow anything.
declare module '../../public/registries' {
  interface ContentTypeSchemas {
    'api::ignored.ignored': Struct.SingleTypeSchema;
  }
  interface ComponentSchemas {
    'ignored.ignored': Struct.ComponentSchema;
  }
}

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// Without generated schemas, strict mode keeps the generic UIDs and schemas, as without strict mode.
declare const emptyChecks: [
  Expect<Equal<UID.ContentType, Internal.UID.ContentType>>,
  Expect<Equal<UID.Component, Internal.UID.Component>>,
  Expect<Equal<UID.CollectionType, Internal.UID.ContentType>>,
  Expect<Equal<UID.SingleType, Internal.UID.ContentType>>,
  Expect<Equal<ContentType<'api::any.any'>, Struct.ContentTypeSchema>>,
  Expect<Equal<Component<'any.any'>, Struct.ComponentSchema>>,
  // The Public entries resolve to the generic schema, not to their augmented one.
  Expect<Equal<ContentType<'api::ignored.ignored'>, Struct.ContentTypeSchema>>,
  Expect<Equal<Component<'ignored.ignored'>, Struct.ComponentSchema>>,
  Expect<Equal<UID.IsSingleType<'api::ignored.ignored'>, UID.IsSingleType<'api::any.any'>>>,
];
emptyChecks satisfies unknown;

const anyContentType: UID.ContentType = 'api::any.any';
const anyComponent: UID.Component = 'any.any';
anyContentType satisfies string;
anyComponent satisfies string;
