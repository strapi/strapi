// Static type fixture for the document-service test resources in ../schemas.
//
// Kept hand-written (these resources are registered at runtime, so nothing generates them)
// but written in the same form the CLI emits today: `Struct.ComponentSchema` +
// `Schema.Attribute.*`. The older `Schema.Component` + top-level `Attribute` form does not
// resolve against current `@strapi/types` — every interface silently degraded to `any`, so
// markers like `Required` here had no effect. See ./components.probe.ts, which fails to
// compile if these declarations stop being enforceable.
//
// UIDs below are `<category>.<filename>` — loadComponents derives them from the schema file
// on disk, not from the map keys in ../schemas/index.js (the builder passes only the values,
// so those keys are inert). Hence `article.compo-unique-all`, matching how the runtime tests
// and ../schemas/article.js actually reference these components.
import type { Schema, Struct } from '@strapi/types';

export interface ArticleComp extends Struct.ComponentSchema {
  collectionName: 'components_article_comments';
  info: {
    displayName: 'Comp';
    description: '';
  };
  attributes: {
    text: Schema.Attribute.String & Schema.Attribute.Required;
    note: Schema.Attribute.String;
  };
}

export interface ArticleDzComp extends Struct.ComponentSchema {
  collectionName: 'components_article_dz_comps';
  info: {
    displayName: 'dz_comp';
  };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
    media: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
  };
}

export interface ArticleDzOtherComp extends Struct.ComponentSchema {
  collectionName: 'components_article_dz_other_comps';
  info: {
    displayName: 'dz_other_comp';
  };
  attributes: {
    name: Schema.Attribute.String;
  };
}

export interface ArticleCompoUniqueAll extends Struct.ComponentSchema {
  collectionName: 'components_unique_all';
  info: {
    displayName: 'compo_unique_all';
  };
  attributes: {
    ComponentTextShort: Schema.Attribute.String;
    ComponentTextLong: Schema.Attribute.Text;
    ComponentNumberInteger: Schema.Attribute.Integer;
    ComponentNumberBigInteger: Schema.Attribute.BigInteger;
    ComponentNumberDecimal: Schema.Attribute.Decimal;
    ComponentNumberFloat: Schema.Attribute.Float;
    ComponentEmail: Schema.Attribute.Email;
    ComponentDateDate: Schema.Attribute.Date;
    ComponentDateDateTime: Schema.Attribute.DateTime;
    ComponentDateTime: Schema.Attribute.Time;
  };
}

export interface ArticleCompoUniqueTopLevel extends Struct.ComponentSchema {
  collectionName: 'components_unique_top_level';
  info: {
    displayName: 'compo_unique_top_level';
  };
  attributes: {
    nestedUnique: Schema.Attribute.Component<'article.compo-unique-all', false>;
  };
}

export interface MixedContentNestedMediaLeaf extends Struct.ComponentSchema {
  collectionName: 'components_mixed_content_nested_media_leaves';
  info: {
    displayName: 'Mixed Content Nested Media Leaf';
  };
  attributes: {
    media: Schema.Attribute.Media;
  };
}

export interface MixedContentNestedMediaWrapper extends Struct.ComponentSchema {
  collectionName: 'components_mixed_content_nested_media_wrappers';
  info: {
    displayName: 'Mixed Content Nested Media Wrapper';
  };
  attributes: {
    nestedLeaf: Schema.Attribute.Component<'mixed-content.mixed-content-nested-media-leaf', false>;
  };
}

declare module '@strapi/types' {
  export namespace Public {
    export interface ComponentSchemas {
      'article.comp': ArticleComp;
      'article.dz-comp': ArticleDzComp;
      'article.dz-other-comp': ArticleDzOtherComp;
      'article.compo-unique-all': ArticleCompoUniqueAll;
      'article.compo-unique-top-level': ArticleCompoUniqueTopLevel;
      'mixed-content.mixed-content-nested-media-leaf': MixedContentNestedMediaLeaf;
      'mixed-content.mixed-content-nested-media-wrapper': MixedContentNestedMediaWrapper;
    }
  }
}
