import type { Schema, Struct } from '../../../../../..';

interface Article extends Struct.CollectionTypeSchema {
  collectionName: 'articles';
  info: { singularName: 'article'; pluralName: 'articles'; displayName: 'Article' };
  options: { draftAndPublish: true };
  attributes: {
    title: Schema.Attribute.String;
  };
}

interface Tag extends Struct.CollectionTypeSchema {
  collectionName: 'tags';
  info: { singularName: 'tag'; pluralName: 'tags'; displayName: 'Tag' };
  options: { draftAndPublish: false };
  attributes: {
    name: Schema.Attribute.String;
    // `status` is only reserved when draft and publish is enabled
    status: Schema.Attribute.Enumeration<['active', 'archived']>;
  };
}

interface Homepage extends Struct.SingleTypeSchema {
  collectionName: 'homepages';
  info: { singularName: 'homepage'; pluralName: 'homepages'; displayName: 'Homepage' };
  attributes: {
    title: Schema.Attribute.String;
  };
}

declare module '../../../../../../public/registries' {
  export interface ContentTypeSchemas {
    'api::article.article': Article;
    'api::tag.tag': Tag;
    'api::homepage.homepage': Homepage;
  }
}
