import type { Modules, Schema, Struct } from '../../../..';

interface Article extends Struct.CollectionTypeSchema {
  collectionName: 'articles';
  info: { singularName: 'article'; pluralName: 'articles'; displayName: 'Article' };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String;
    summary: Schema.Attribute.Text;
    publishedOn: Schema.Attribute.DateTime;
    score: Schema.Attribute.Decimal;
    views: Schema.Attribute.Integer;
    featured: Schema.Attribute.Boolean;
    metadata: Schema.Attribute.JSON;
  };
}

declare module '../../../../public/registries' {
  export interface ContentTypeSchemas {
    'api::article.article': Article;
  }
}

type ArticleInput = Modules.Documents.Params.Data.Input<'api::article.article'>;

export const clearOptionalScalars = {
  title: null,
  summary: null,
  publishedOn: null,
  score: null,
  views: null,
  featured: null,
  metadata: null,
} satisfies Partial<ArticleInput>;

export const keepsOptionalScalarValues = {
  title: 'Title',
  publishedOn: '2026-01-01T10:00:00.000Z',
  score: 1.5,
  featured: true,
} satisfies Partial<ArticleInput>;

export const requiredScalarAcceptsValue = { code: 'abc', title: null } satisfies ArticleInput;

export const requiredScalarRejectsNull = {
  // @ts-expect-error A required attribute cannot be set to null.
  code: null,
} satisfies ArticleInput;
