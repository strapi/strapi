// The schemas and the `Public` block of a generated schema file: what type generation writes with
// `typescript.strictTypes` off, and also writes with it on. `schemas-without-switch.ts` adds the
// global block of the strict form.
import type { Data, Modules, Schema, Struct } from '@strapi/strapi';

export interface ArticleSchema extends Struct.CollectionTypeSchema {
  collectionName: 'articles';
  info: { singularName: 'article'; pluralName: 'articles'; displayName: 'Article' };
  options: { draftAndPublish: true };
  attributes: {
    title: Schema.Attribute.String;
    slug: Schema.Attribute.UID<'title'> & Schema.Attribute.Required;
    views: Schema.Attribute.Integer;
    cover: Schema.Attribute.Media<'images'>;
    seo: Schema.Attribute.Component<'shared.seo', false>;
  };
}

export interface SeoSchema extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: { displayName: 'Seo' };
  attributes: { metaTitle: Schema.Attribute.String & Schema.Attribute.Required };
}

declare module '@strapi/strapi' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Public {
    export interface ContentTypeSchemas {
      'api::article.article': ArticleSchema;
    }
    export interface ComponentSchemas {
      'shared.seo': SeoSchema;
    }
  }
}

// The consumer test compares these types between a program with this file only and a program that
// also has the global block.
export type ArticleDocument = Modules.Documents.Result<'api::article.article'>;
export type ArticleTitle = ArticleDocument['title'];
export type ArticleValues = Data.ContentType<'api::article.article'>;
