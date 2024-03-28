import type { Schema, UID, Utils } from '../..';

export type IsDraftAndPublishEnabled<TSchemaUID extends UID.Schema> = Utils.MatchFirst<
  [
    [
      UID.IsContentType<TSchemaUID>,
      Utils.IsTrue<NonNullable<Schema.Schema<TSchemaUID>['options']>['draftAndPublish']>,
    ],
    [
      // Here, we're manually excluding potential overlap between Component and ContentTypes' UIDs and thus preventing false positives
      // e.g. api::foo.bar extends a Component UID (`${string}.${string}`) but shouldn't be considered a component
      Utils.And<Utils.Not<Utils.Extends<TSchemaUID, UID.ContentType>>, UID.IsComponent<TSchemaUID>>,
      Utils.Constants.False,
    ],
  ],
  // True by default
  Utils.Constants.True
>;
