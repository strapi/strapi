import type { Common, Utils } from '@strapi/strapi';

export type Kind = 'preview' | 'live';

export type IsEnabled<TSchemaUID extends Common.UID.Schema> = Utils.Expression.MatchFirst<
  [
    [
      Common.UID.IsContentType<TSchemaUID>,
      Utils.Expression.IsTrue<Common.Schemas[TSchemaUID]['options']['draftAndPublish']>
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
  Utils.Expression.BooleanValue
>;

export type For<TSchemaUID extends Common.UID.Schema> = IsEnabled<TSchemaUID> extends infer TEnabled
  ? Utils.Expression.If<
      Utils.Expression.Or<
        // If publication state is enabled for the given content type
        Utils.Expression.IsTrue<TEnabled>,
        // Or if the content type is not resolved (IsEnabled is BooleanValue)
        // NOTE: The parameters order is important here ([true/false] extends [boolean] but [boolean] don't extend [true/false])
        Utils.Expression.Extends<Utils.Expression.BooleanValue, TEnabled>
      >,
      // Then add the publicationState param
      { publicationState?: Kind },
      // Else, don't do anything
      {}
    >
  : never;
