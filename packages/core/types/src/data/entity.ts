import type { ContentType } from './content-type';
import type { Component } from './component';

import type * as UID from '../uid';
import type { ModelType, AttributeNames } from '../schema';

/**
 * Represents any entry, either for a content-type or a component.
 *
 * @template TSchemaUID - The entry schema UID
 * @template TKeys - A union of keys to be returned in the final object. If not specified, defaults to all the keys.
 */
export type Entity<
  TSchemaUID extends UID.Schema = UID.Schema,
  TKeys extends AttributeNames<TSchemaUID> = AttributeNames<TSchemaUID>,
> = {
  contentType: ContentType<Extract<TSchemaUID, UID.ContentType>, TKeys>;
  component: Component<Extract<TSchemaUID, UID.Component>, TKeys>;
}[ModelType<TSchemaUID>];
