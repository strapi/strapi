import type * as Schema from '../../../../schema';

import type * as UID from '../../../../uid';
import type { Constants, If, StrictEqual } from '../../../../utils';

import type { ID, DocumentID } from './id';

type ShortHand = ID;
type LongHandEntity = { id: ID };
type LongHandDocument = { documentId: DocumentID; locale?: string };
type LongHand = LongHandEntity | LongHandDocument;

interface PositionalArguments {
  before?: ID;
  after?: ID;
  start?: boolean;
  end?: boolean;
}

type WithPositionArguments<T> = T & { position?: PositionalArguments };

type Set = { set: ShortHand[] | LongHand[] | null };
type Connect = { connect: ShortHand[] | WithPositionArguments<LongHand>[] };
type Disconnect = { disconnect: ShortHand[] | LongHand[] };

type FullUpdate = Set;
type PartialUpdate = Partial<Connect & Disconnect>;

type XOneInput = ShortHand | LongHand | null;
type XManyInput = ShortHand[] | LongHand[] | null | PartialUpdate | FullUpdate;

export type RelationInputValue<TRelationKind extends Schema.Attribute.RelationKind.Any> = If<
  Schema.Attribute.IsManyRelation<TRelationKind>,
  XManyInput,
  XOneInput
>;

/** `connect` on a media attribute takes no `position`: the runtime always appends the file. */
type MediaConnect = { connect: ShortHand[] | LongHand[] };

type MediaManyInput =
  ShortHand[] | LongHand[] | null | Partial<MediaConnect & Disconnect> | FullUpdate;

/**
 * The input of a media attribute with strict types. A media attribute is a relation to upload files
 * (`plugin::upload.file`), so it takes the relation input formats: a single media takes one file
 * (an ID, `{ id }` or `{ documentId }`) or `null`; a multiple media takes an array of IDs or an array
 * of objects, `null`, `connect` and `disconnect`, or `set`. `connect` takes no `position`.
 *
 * A media attribute whose plurality is unknown keeps the loose {@link Schema.Attribute.MediaValue}.
 *
 * At runtime, multiple media differ from to-many relations in two cases, both fixed by
 * https://github.com/strapi/strapi/pull/27116:
 * - `connect` on create attaches no file (https://github.com/strapi/strapi/issues/27989);
 * - on update, an empty change (`{}`, `{ connect: [] }`, `{ disconnect: [] }`) unlinks every file.
 */
export type MediaInputValue<TMultiple extends Constants.BooleanValue = Constants.False> = If<
  StrictEqual<TMultiple, Constants.BooleanValue>,
  Schema.Attribute.MediaValue<TMultiple>,
  If<TMultiple, MediaManyInput, XOneInput>
>;

type RelationsKeysWithoutTarget<TSchemaUID extends UID.Schema> = Exclude<
  Schema.AttributeNamesByType<TSchemaUID, 'relation'>,
  Schema.AttributeNamesWithTarget<TSchemaUID>
>;

export type OmitRelationsWithoutTarget<TSchemaUID extends UID.Schema, TValue> = Omit<
  TValue,
  RelationsKeysWithoutTarget<TSchemaUID>
>;
