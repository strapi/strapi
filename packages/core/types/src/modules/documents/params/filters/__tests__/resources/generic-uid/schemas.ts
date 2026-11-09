import type { Schema, Struct } from '../../../../../../..';

interface Meta extends Struct.ComponentSchema {
  collectionName: 'components_shared_meta';
  info: { displayName: 'Meta' };
  attributes: {
    label: Schema.Attribute.String;
  };
}

interface Post extends Struct.CollectionTypeSchema {
  collectionName: 'posts';
  info: { singularName: 'post'; pluralName: 'posts'; displayName: 'Post' };
  attributes: {
    title: Schema.Attribute.String;
    slug: Schema.Attribute.UID<'title'>;
    views: Schema.Attribute.Integer;
    meta: Schema.Attribute.Component<'shared.meta', false>;
    tags: Schema.Attribute.Relation<'manyToMany', 'api::tag.tag'>;
    writer: Schema.Attribute.Relation<'manyToOne', 'api::writer.writer'>;
    translations: Schema.Attribute.Relation<'oneToMany', 'api::post.post'>;
  };
}

interface Tag extends Struct.CollectionTypeSchema {
  collectionName: 'tags';
  info: { singularName: 'tag'; pluralName: 'tags'; displayName: 'Tag' };
  attributes: {
    name: Schema.Attribute.String;
    posts: Schema.Attribute.Relation<'manyToMany', 'api::post.post'>;
  };
}

interface Writer extends Struct.CollectionTypeSchema {
  collectionName: 'writers';
  info: { singularName: 'writer'; pluralName: 'writers'; displayName: 'Writer' };
  attributes: {
    name: Schema.Attribute.String;
    posts: Schema.Attribute.Relation<'oneToMany', 'api::post.post'>;
  };
}

declare module '../../../../../../../public/registries' {
  export interface ContentTypeSchemas {
    'api::post.post': Post;
    'api::tag.tag': Tag;
    'api::writer.writer': Writer;
  }
  export interface ComponentSchemas {
    'shared.meta': Meta;
  }
}
