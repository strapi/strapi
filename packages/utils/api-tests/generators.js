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
    displayName: 'Article',
    singularName: 'article',
    pluralName: 'articles',
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
    displayName: 'Tag',
    singularName: 'tag',
    pluralName: 'tags',
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
    displayName: 'Category',
    singularName: 'category',
    pluralName: 'categories',
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
    displayName: 'Reference',
    singularName: 'reference',
    pluralName: 'references',
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
    displayName: 'Product',
    singularName: 'product',
    pluralName: 'products',
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
    displayName: 'Article with tag',
    singularName: 'articlewithtag',
    pluralName: 'articlewithtags',
    description: '',
    collectionName: '',
  },
};
