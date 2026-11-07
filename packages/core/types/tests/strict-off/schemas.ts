import type { Modules, Public, Schema, Struct, UID, Utils } from '../../src';
import type * as Internal from '../../src/internal';
import type { Equal, Expect } from './helpers';

// Global schema registries are strict-only: the Public registries keep their generic index signatures.
declare const schemaChecks: [
  Expect<Equal<UID.ContentType, Internal.UID.ContentType>>,
  Expect<Equal<UID.Component, Internal.UID.Component>>,
  Expect<Equal<UID.SingleType, Internal.UID.ContentType>>,
  Expect<Equal<Schema.ContentType<'api::strict-only.page'>, Struct.ContentTypeSchema>>,
  Expect<Equal<Schema.Component<'strict-only.seo'>, Struct.ComponentSchema>>,
];
schemaChecks satisfies unknown;

// Package content-type schemas are strict-only too: a declared UID keeps develop's generic types.
declare const packageSchemaChecks: [
  Expect<Equal<Schema.ContentTypes, Public.ContentTypeSchemas>>,
  Expect<Equal<Schema.ContentType<'plugin::legacy.item'>, Struct.ContentTypeSchema>>,
  Expect<
    Equal<
      Utils.Constants.IsSchemaRegistered<'plugin::legacy.item'>,
      Utils.Constants.AreSchemaRegistriesExtended
    >
  >,
  Expect<Equal<Utils.Constants.IsSchemaRegistered<'plugin::legacy.item'>, false>>,
  Expect<Equal<Modules.Documents.Document<'plugin::legacy.item'>, Modules.Documents.AnyDocument>>,
  Expect<Equal<Modules.Documents.Result<'plugin::legacy.item'>, Modules.Documents.AnyDocument>>,
  Expect<
    Equal<
      Modules.Documents.Params.Data.PartialInput<'plugin::legacy.item'>,
      Modules.Documents.Params.Data.Input<'plugin::legacy.item'>
    >
  >,
];
packageSchemaChecks satisfies unknown;
