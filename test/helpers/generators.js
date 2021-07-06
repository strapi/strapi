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
        nature: 'manyToOne',
        target: 'plugins::users-permissions.user',
        targetAttribute: 'articles',
      },
    },
    uid: 'application::article.article',
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
        dominant: true,
        nature: 'manyToMany',
        target: 'application::article.article',
        targetAttribute: 'tags',
      },
    },
    uid: 'application::tag.tag',
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
        nature: 'oneToMany',
        target: 'application::article.article',
        targetAttribute: 'category',
      },
    },
    uid: 'application::category.category',
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
        target: 'application::article.article',
        targetAttribute: 'reference',
        nature: 'oneToOne',
      },
      tag: {
        nature: 'oneWay',
        target: 'application::tag.tag',
      },
    },
    uid: 'application::reference.reference',
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
    uid: 'application::product.product',
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
        nature: 'manyWay',
        target: 'application::tag.tag',
      },
    },
    uid: 'application::articlewit.articlewit',
    name: 'articlewithtag',
    description: '',
    collectionName: '',
  },
};
