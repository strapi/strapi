import type * as Schema from '../../../../schema';

import type * as UID from '../../../../uid';
import type { Constants, If } from '../../../../utils';

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

/**
 * Media attributes are persisted as a morph relation to `plugin::upload.file` at write time -
 * see `buildRelationsStore` in the entity validator. Unlike regular relations, that runtime
 * path only ever reads a bare id or an `{ id }` object off each entry (for the value itself,
 * `connect`, `set`, and `disconnect`) - it never resolves `documentId`. So media inputs use
 * their own, narrower id-only long-hand rather than reusing `relation`'s `LongHand`, which
 * would type-check a `documentId` update that silently drops the existing association instead
 * of applying it.
 */
type MediaShortHand = ID;
type MediaLongHand = { id: ID };

type MediaSet = { set: MediaShortHand[] | MediaLongHand[] | null };
type MediaConnect = { connect: MediaShortHand[] | WithPositionArguments<MediaLongHand>[] };
type MediaDisconnect = { disconnect: MediaShortHand[] | MediaLongHand[] };

type MediaFullUpdate = MediaSet;
type MediaPartialUpdate = Partial<MediaConnect & MediaDisconnect>;

type MediaXOneInput = MediaShortHand | MediaLongHand | null;
type MediaXManyInput =
  | MediaShortHand[]
  | MediaLongHand[]
  | null
  | MediaPartialUpdate
  | MediaFullUpdate;

// A naked conditional (as opposed to `If`, which is intentionally non-distributive - see its
// JSDoc) so a widened/generic `TMultiple extends boolean` distributes into `XManyInput |
// XOneInput` instead of collapsing to the `false` branch.
export type MediaInputValue<TMultiple extends Constants.BooleanValue> =
  TMultiple extends Constants.True
    ? MediaXManyInput
    : TMultiple extends Constants.False
      ? MediaXOneInput
      : never;

type RelationsKeysWithoutTarget<TSchemaUID extends UID.Schema> = Exclude<
  Schema.AttributeNamesByType<TSchemaUID, 'relation'>,
  Schema.AttributeNamesWithTarget<TSchemaUID>
>;

export type OmitRelationsWithoutTarget<TSchemaUID extends UID.Schema, TValue> = Omit<
  TValue,
  RelationsKeysWithoutTarget<TSchemaUID>
>;
