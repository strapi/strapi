import type { ContentType } from '../../../../types';

export const rawData: Record<string, ContentType> = {
  homeSingleType: {
    uid: 'plugin::myplugins.home',
    globalId: 'Home',
    info: {
      displayName: 'Home',
      singularName: 'home',
      pluralName: 'homes',
    },
    modelName: 'home',
    modelType: 'contentType',
    kind: 'singleType',
    attributes: [
      {
        name: 'category',
        type: 'relation',
        relation: 'oneToOne',
        targetAttribute: null,
        target: 'category',
      },
      { name: 'address', type: 'string' },
    ],
    visible: true,
    restrictRelationsTo: [],
    status: 'NEW',
  },
  articleContentType: {
    uid: 'plugin::myplugins.article',
    kind: 'collectionType',
    globalId: 'article',
    info: {
      displayName: 'article',
      singularName: 'article',
      pluralName: 'articles',
    },
    modelName: 'article',
    modelType: 'contentType',
    attributes: [
      {
        name: 'user',
        relation: 'manyToOne',
        type: 'relation',
        target: 'user',
        targetAttribute: 'article',
      },
      { name: 'category', type: 'string' },
    ],
    visible: true,
    restrictRelationsTo: [],
    status: 'NEW',
  },
  postContentType: {
    uid: 'plugin::myplugins.post',
    kind: 'collectionType',
    globalId: 'post',
    info: {
      displayName: 'post',
      singularName: 'post',
      pluralName: 'posts',
    },
    modelName: 'post',
    modelType: 'contentType',

    attributes: [
      {
        relation: 'oneToMany',
        targetAttribute: null,
        type: 'relation',
        target: 'user',
        name: 'user',
      },
      { type: 'string', name: 'title' },
    ],
    visible: true,
    restrictRelationsTo: [],
    status: 'NEW',
  },
};
