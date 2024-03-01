import type { ContentType } from './content-type';
import type { Component } from './component';

import type * as UID from '../uid';
import type { ModelType, AttributeNames } from '../schema';

export type Entity<
  TSchemaUID extends UID.Schema = UID.Schema,
  TKeys extends AttributeNames<TSchemaUID> = AttributeNames<TSchemaUID>
> = {
  contentType: ContentType<Extract<TSchemaUID, UID.ContentType>, TKeys>;
  component: Component<Extract<TSchemaUID, UID.Component>, TKeys>;
}[ModelType<TSchemaUID>];
