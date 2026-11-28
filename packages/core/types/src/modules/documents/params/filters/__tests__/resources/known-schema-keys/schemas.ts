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
    author: Schema.Attribute.Relation<'manyToOne', 'api::author.author'>;
    coauthors: Schema.Attribute.Relation<'manyToMany', 'api::author.author'>;
    cover: Schema.Attribute.Media<'images'>;
    // The target is not in the registries, so its attribute names are unknown
    legacy: Schema.Attribute.Relation<'manyToOne', 'api::legacy.legacy'>;
  };
}

/**
 * A content type with a password attribute, which filters do not accept
 */
interface Author extends Struct.CollectionTypeSchema {
  collectionName: 'authors';
  info: { singularName: 'author'; pluralName: 'authors'; displayName: 'Author' };
  attributes: {
    name: Schema.Attribute.String;
    secret: Schema.Attribute.Password;
  };
}

/**
 * The media target, registered as in apps with generated types
 */
interface File extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: { singularName: 'file'; pluralName: 'files'; displayName: 'File' };
  attributes: {
    name: Schema.Attribute.String;
  };
}

declare module '../../../../../../../public/registries' {
  export interface ContentTypeSchemas {
    'api::article.article': Article;
    'api::author.author': Author;
    'plugin::upload.file': File;
  }
  export interface ComponentSchemas {
    'shared.seo': Seo;
    'shared.link': Link;
    'shared.card': Card;
    'shared.mixed': Mixed;
  }
}
