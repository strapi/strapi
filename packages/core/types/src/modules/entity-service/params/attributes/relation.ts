import type { Attribute, Common, Utils } from '../../../../types';
import type { ID } from './id';

type ShortHand = ID;
type LongHand = { id: ID };

interface PositionalArguments {
  before?: ID;
  after?: ID;
  start?: boolean;
  end?: boolean;
}

type WithPositionArguments<T> = T & { position: PositionalArguments };

type Set = { set: ShortHand[] | LongHand[] | null };
type Connect = { connect: ShortHand[] | WithPositionArguments<LongHand>[] };
type Disconnect = { disconnect: ShortHand[] | LongHand[] };

type FullUpdate = Set;
type PartialUpdate = Partial<Connect & Disconnect>;

type XOneInput = ShortHand | LongHand | null;
type XManyInput = ShortHand[] | LongHand[] | null | PartialUpdate | FullUpdate;

type RelationInputValue<TRelationKind extends Attribute.RelationKind.Any> = Utils.Expression.If<
  Attribute.IsManyRelation<TRelationKind>,
  XManyInput,
  XOneInput
>;

type RelationsKeysWithoutTarget<TSchemaUID extends Common.UID.Schema> = Exclude<
  Attribute.GetKeysByType<TSchemaUID, 'relation'>,
  Attribute.GetKeysWithTarget<TSchemaUID>
>;

type OmitRelationsWithoutTarget<TSchemaUID extends Common.UID.Schema, TValue> = Omit<
  TValue,
  RelationsKeysWithoutTarget<TSchemaUID>
>;

export type { RelationInputValue, RelationsKeysWithoutTarget, OmitRelationsWithoutTarget };
