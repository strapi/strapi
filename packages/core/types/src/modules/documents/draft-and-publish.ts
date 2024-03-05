import type { Common, Utils } from '../../types';

export type IsDraftAndPublishEnabled<TSchemaUID extends Common.UID.Schema> =
  Utils.Expression.MatchFirst<
    [
      [
        Common.UID.IsContentType<TSchemaUID>,
        Utils.Expression.IsTrue<
          NonNullable<Common.Schemas[TSchemaUID]['options']>['draftAndPublish']
        >
      ],
      [
        // Here, we're manually excluding potential overlap between Component and ContentTypes' UIDs and thus preventing false positives
        // e.g. api::foo.bar extends a Component UID (`${string}.${string}`) but shouldn't be considered a component
        Utils.Expression.And<
          Utils.Expression.Not<Utils.Expression.Extends<TSchemaUID, Common.UID.ContentType>>,
          Common.UID.IsComponent<TSchemaUID>
        >,
        Utils.Expression.False
      ]
    ],
    // True by default
    Utils.Expression.True
  >;
