import type { ID } from './constants';

import type { Intersect } from '../utils';
import type * as UID from '../uid';
import type { AttributeNames, AttributeValueByName, RequiredAttributeNames } from '../schema';

/**
 * A type used as the identifier for a document.
 */
export type DocumentID = string;

/**
 * Represents a content-type entry.
 *
 * @template TContentTypeUID - The content-type schema UID
 * @template TContentTypeKeys - A union of keys to be returned in the final object. If not specified, defaults to all the keys.
 */
export type ContentType<
  TContentTypeUID extends UID.ContentType = UID.ContentType,
  TContentTypeKeys extends AttributeNames<TContentTypeUID> = AttributeNames<TContentTypeUID>,
> = Intersect<
  [
    { id: ID; documentId: DocumentID },
    Pick<
      AttributeValues<TContentTypeUID>,
      Extract<TContentTypeKeys, keyof AttributeValues<TContentTypeUID>>
    >,
  ]
>;

/**
 * @internal
 */
type AttributeValues<TContentTypeUID extends UID.ContentType = UID.ContentType> = {
  [TAttributeName in Exclude<
    AttributeNames<TContentTypeUID>,
    RequiredAttributeNames<TContentTypeUID>
  >]?: AttributeValueByName<TContentTypeUID, TAttributeName> | null;
} & {
  [TAttributeName in AttributeNames<TContentTypeUID> &
    RequiredAttributeNames<TContentTypeUID>]: AttributeValueByName<TContentTypeUID, TAttributeName>;
};
