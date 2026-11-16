import type { Modules, Schema, Struct } from '../../../..';

interface Seo extends Struct.ComponentSchema {
  collectionName: 'components_seo';
  info: { displayName: 'Seo' };
  attributes: { label: Schema.Attribute.String };
}

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
    seo: Schema.Attribute.Component<'default.seo', false>;
    sections: Schema.Attribute.Component<'default.seo', true>;
    blocks: Schema.Attribute.DynamicZone<['default.seo']>;
  };
}

declare module '../../../../public/registries' {
  export interface ContentTypeSchemas {
    'api::article.article': Article;
  }
  export interface ComponentSchemas {
    'default.seo': Seo;
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

export const clearOptionalComponent = { seo: null } satisfies Partial<ArticleInput>;

export const repeatableComponentRejectsNull = {
  // @ts-expect-error A repeatable component is validated as required and cannot be null.
  sections: null,
} satisfies Partial<ArticleInput>;

export const dynamicZoneRejectsNull = {
  // @ts-expect-error A dynamic zone is validated as required and cannot be null.
  blocks: null,
} satisfies Partial<ArticleInput>;
