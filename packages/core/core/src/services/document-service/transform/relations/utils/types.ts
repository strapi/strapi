import type { Data } from '@strapi/types';

export type ID = Data.ID;
// Shorthand is a document ID, or a numeric entry id (see `isNumeric` in map-relation)
export type ShortHand = Data.ID | Data.DocumentID;
// Relation can be connected either with an id or document ID
export type LongHandEntity = { id: ID; position?: object };
export type LongHandDocument = {
  documentId: Data.DocumentID;
  locale?: string;
  status?: 'draft' | 'published';
  position?: object;
};

export type LongHand = LongHandEntity | LongHandDocument;
export type RelationPrimitives = ShortHand | LongHand | ShortHand[] | LongHand[] | null | undefined;
export type Relation =
  | RelationPrimitives
  | { connect?: RelationPrimitives; disconnect?: RelationPrimitives; set?: RelationPrimitives };

export type GetIds = (relation: ID) => ID[] | null;
