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
    connection: 'default',
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
    connection: 'default',
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
    connection: 'default',
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
    connection: 'default',
    name: 'reference',
    description: '',
    collectionName: '',
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
    connection: 'default',
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
    connection: 'default',
    name: 'articlewithtag',
    description: '',
    collectionName: '',
  },
};
