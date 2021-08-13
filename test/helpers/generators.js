'use strict';

module.exports = {
  article: {
    attributes: {
      title: {
        type: 'string',
      },
      date: {
        type: 'date',
      },
      jsonField: {
        type: 'json',
      },
      content: {
        type: 'richtext',
      },
      author: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'plugin::users-permissions.user',
        targetAttribute: 'articles',
      },
    },
    uid: 'api::article.article',
    name: 'article',
    description: '',
    collectionName: '',
  },
  tag: {
    attributes: {
      name: {
        type: 'string',
      },
      articles: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::article.article',
        targetAttribute: 'tags',
      },
    },
    uid: 'api::tag.tag',
    name: 'tag',
    description: '',
    collectionName: '',
  },
  category: {
    attributes: {
      name: {
        type: 'string',
      },
      articles: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::article.article',
        targetAttribute: 'category',
      },
    },
    uid: 'api::category.category',
    name: 'category',
    description: '',
    collectionName: '',
  },
  reference: {
    attributes: {
      name: {
        type: 'string',
      },
      article: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::article.article',
        targetAttribute: 'reference',
      },
      tag: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::tag.tag',
      },
    },
    uid: 'api::reference.reference',
    name: 'reference',
    description: '',
    collectionName: 'refs',
  },
  product: {
    attributes: {
      name: {
        type: 'string',
      },
      description: {
        type: 'richtext',
      },
      published: {
        type: 'boolean',
      },
    },
    uid: 'api::product.product',
    name: 'product',
    description: '',
    collectionName: '',
  },
  articlewithtag: {
    attributes: {
      title: {
        type: 'string',
      },
      tags: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::tag.tag',
      },
    },
    uid: 'api::articlewit.articlewit',
    name: 'articlewithtag',
    description: '',
    collectionName: '',
  },
};
