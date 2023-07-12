import type { Common, Utils } from '@strapi/strapi';

export type Kind = 'preview' | 'live';

export type IsEnabled<TSchemaUID extends Common.UID.Schema> = Utils.Expression.If<
  Common.UID.IsContentType<TSchemaUID>,
  Utils.Expression.IsTrue<Common.Schemas[TSchemaUID]['options']['draftAndPublish']>,
  unknown
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
