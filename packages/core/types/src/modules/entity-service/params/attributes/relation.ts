import type * as Schema from '../../../../schema';

import type { If } from '../../../../utils';
import type * as UID from '../../../../uid';

import type { ID } from './id';

type ShortHand = ID;
type LongHandEntity = { id: ID };
type LongHandDocument = { documentId: ID; locale?: string };
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

type RelationInputValue<TRelationKind extends Schema.Attribute.RelationKind.Any> = If<
  Schema.Attribute.IsManyRelation<TRelationKind>,
  XManyInput,
  XOneInput
>;

type RelationsKeysWithoutTarget<TSchemaUID extends UID.Schema> = Exclude<
  Schema.AttributeNamesByType<TSchemaUID, 'relation'>,
  Schema.AttributeNamesWithTarget<TSchemaUID>
>;

type OmitRelationsWithoutTarget<TSchemaUID extends UID.Schema, TValue> = Omit<
  TValue,
  RelationsKeysWithoutTarget<TSchemaUID>
>;

export type { RelationInputValue, RelationsKeysWithoutTarget, OmitRelationsWithoutTarget };
