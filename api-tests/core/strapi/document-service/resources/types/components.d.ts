import type { Schema, Attribute } from '@strapi/strapi';

export interface ArticleComp extends Schema.Component {
  collectionName: 'components_article_comments';
  info: {
    displayName: 'Comp';
    description: '';
  };
  attributes: {
    text: Attribute.String;
  };
}

export interface ArticleDzComp extends Schema.Component {
  collectionName: 'components_article_dz_comps';
  info: {
    displayName: 'dz_comp';
  };
  attributes: {
    name: Attribute.String;
    media: Attribute.Media;
  };
}

export interface ArticleDzOtherComp extends Schema.Component {
  collectionName: 'components_article_dz_other_comps';
  info: {
    displayName: 'dz_other_comp';
  };
  attributes: {
    name: Attribute.String;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'article.comp': ArticleComp;
      'article.dz-comp': ArticleDzComp;
      'article.dz-other-comp': ArticleDzOtherComp;
    }
  }
}
