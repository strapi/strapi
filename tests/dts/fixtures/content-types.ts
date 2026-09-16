/**
 * Content-type registry of a fictional application, shaped like the declarations Strapi generates
 * in `types/generated/contentTypes.d.ts`.
 */
import type { Struct } from '@strapi/types';

export interface ApiArticleArticle extends Struct.CollectionTypeSchema {
  collectionName: 'articles';
  info: {
    singularName: 'article';
    pluralName: 'articles';
    displayName: 'Article';
  };
  attributes: {
    title: { type: 'string' };
  };
}

export interface ApiHomepageHomepage extends Struct.SingleTypeSchema {
  collectionName: 'homepages';
  info: {
    singularName: 'homepage';
    pluralName: 'homepages';
    displayName: 'Homepage';
  };
  attributes: {
    headline: { type: 'string' };
  };
}

declare module '@strapi/types' {
  export namespace Public {
    export interface ContentTypeSchemas {
      'api::article.article': ApiArticleArticle;
      'api::homepage.homepage': ApiHomepageHomepage;
    }
  }
}
