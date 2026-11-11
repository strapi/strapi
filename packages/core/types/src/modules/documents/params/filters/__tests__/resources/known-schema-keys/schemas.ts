import type { Schema, Struct } from '../../../../../../..';

/**
 * A component with scalar attributes only
 */
interface Seo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seo';
  info: { displayName: 'Seo' };
  attributes: {
    metaTitle: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text;
  };
}

/**
 * A component with a relation attribute only
 */
interface Link extends Struct.ComponentSchema {
  collectionName: 'components_shared_link';
  info: { displayName: 'Link' };
  attributes: {
    article: Schema.Attribute.Relation<'oneToOne', 'api::article.article'>;
  };
}

/**
 * A component with both scalar and nested attributes
 */
interface Mixed extends Struct.ComponentSchema {
  collectionName: 'components_shared_mixed';
  info: { displayName: 'Mixed' };
  attributes: {
    label: Schema.Attribute.String;
    article: Schema.Attribute.Relation<'oneToOne', 'api::article.article'>;
  };
}

/**
 * A component with a nested component attribute only
 */
interface Card extends Struct.ComponentSchema {
  collectionName: 'components_shared_card';
  info: { displayName: 'Card' };
  attributes: {
    seo: Schema.Attribute.Component<'shared.seo', false>;
  };
}

/**
 * A content type with both scalar and nested attributes
 */
interface Article extends Struct.CollectionTypeSchema {
  collectionName: 'articles';
  info: { singularName: 'article'; pluralName: 'articles'; displayName: 'Article' };
  attributes: {
    title: Schema.Attribute.String;
    seo: Schema.Attribute.Component<'shared.seo', false>;
    links: Schema.Attribute.Component<'shared.link', true>;
  };
}

declare module '../../../../../../../public/registries' {
  export interface ContentTypeSchemas {
    'api::article.article': Article;
  }
  export interface ComponentSchemas {
    'shared.seo': Seo;
    'shared.link': Link;
    'shared.card': Card;
    'shared.mixed': Mixed;
  }
}
