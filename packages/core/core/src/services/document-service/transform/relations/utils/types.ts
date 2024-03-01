// TODO: Shorthand id should only be a string on documents.
// It's also a number here to make it works with existing V4 types.
export type ID = string | number;
export type ShortHand = ID;
// Relation can be connected either with an id or document ID
export type LongHandEntity = { id: ID };
export type LongHandDocument = { documentId: ID; locale?: string };
export type LongHand = LongHandEntity | LongHandDocument;

export type GetId = (relation: ID) => ID | null;
