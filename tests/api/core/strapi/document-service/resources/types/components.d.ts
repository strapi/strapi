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

export interface ArticleCompoUniqueAll extends Schema.Component {
  collectionName: 'components_unique_all';
  info: {
    displayName: 'compo_unique_all';
  };
  attributes: {
    ComponentTextShort: Attribute.String;
    ComponentTextLong: Attribute.Text;
    ComponentNumberInteger: Attribute.Integer;
    ComponentNumberBigInteger: Attribute.BigInteger;
    ComponentNumberDecimal: Attribute.Decimal;
    ComponentNumberFloat: Attribute.Float;
    ComponentEmail: Attribute.Email;
    ComponentDateDate: Attribute.Date;
    ComponentDateDateTime: Attribute.DateTime;
    ComponentDateTime: Attribute.Time;
  };
}

export interface ArticleCompoUniqueTopLevel extends Schema.Component {
  collectionName: 'components_unique_top_level';
  info: {
    displayName: 'compo_unique_top_level';
  };
  attributes: {
    nestedUnique: Attribute.Component;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'article.comp': ArticleComp;
      'article.dz-comp': ArticleDzComp;
      'article.dz-other-comp': ArticleDzOtherComp;
      'article.compo_unique_all': ArticleCompoUniqueAll;
      'article.compo_unique_top_level': ArticleCompoUniqueTopLevel;
    }
  }
}
