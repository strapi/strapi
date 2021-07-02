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
    name: 'articlewithtag',
    description: '',
    collectionName: '',
  },
};
