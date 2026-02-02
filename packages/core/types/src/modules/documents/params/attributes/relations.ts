import type * as Schema from '../../../../schema';

import type * as UID from '../../../../uid';
import type { If } from '../../../../utils';

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

type RelationsKeysWithoutTarget<TSchemaUID extends UID.Schema> = Exclude<
  Schema.AttributeNamesByType<TSchemaUID, 'relation'>,
  Schema.AttributeNamesWithTarget<TSchemaUID>
>;

export type OmitRelationsWithoutTarget<TSchemaUID extends UID.Schema, TValue> = Omit<
  TValue,
  RelationsKeysWithoutTarget<TSchemaUID>
>;
