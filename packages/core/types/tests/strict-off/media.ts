import type { Modules, Schema } from '../../src';
import type { Equal, Expect } from './helpers';

// Media values and inputs keep develop's loose types: the upload file document and the relation
// input formats are strict-only.
type IsAny<T> = 0 extends 1 & T ? true : false;
type SingleMedia = Schema.Attribute.Media<'images'>;
type MultipleMedia = Schema.Attribute.Media<'images' | 'files', true>;
type GenericMedia = Schema.Attribute.Media<Schema.Attribute.MediaKind | undefined, boolean>;
type ImageBlockNode = Extract<Schema.Attribute.BlocksValue[number], { type: 'image' }>;
declare const mediaChecks: [
  Expect<IsAny<Schema.Attribute.MediaValue>>,
  Expect<Equal<Schema.Attribute.MediaValue<true>, any[]>>,
  Expect<IsAny<Schema.Attribute.MediaValue<boolean>>>,
  Expect<IsAny<Schema.Attribute.Value<SingleMedia>>>,
  Expect<Equal<Schema.Attribute.Value<MultipleMedia>, any[]>>,
  Expect<IsAny<Schema.Attribute.Value<GenericMedia>>>,
  Expect<IsAny<Modules.Documents.Params.Attribute.GetValue<SingleMedia>>>,
  Expect<Equal<Modules.Documents.Params.Attribute.GetValue<MultipleMedia>, any[]>>,
  Expect<IsAny<Modules.Documents.Params.Attribute.GetValue<GenericMedia>>>,
  Expect<IsAny<Modules.EntityService.Params.Attribute.GetValue<SingleMedia>>>,
  Expect<Equal<Modules.EntityService.Params.Attribute.GetValue<MultipleMedia>, any[]>>,
  // Blocks image nodes hold a copy of some file fields.
  Expect<IsAny<ImageBlockNode['image']>>,
];
mediaChecks satisfies unknown;
