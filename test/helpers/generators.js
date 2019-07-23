module.exports = {
  article: {
    attributes: [
      {
        name: 'title',
        params: {
          multiple: false,
          type: 'string',
        },
      },
      {
        name: 'content',
        params: {
          multiple: false,
          type: 'wysiwyg',
        },
      },
      {
        name: 'author',
        params: {
          nature: 'manyToOne',
          target: 'user',
          pluginValue: 'users-permissions',
          key: 'articles',
          plugin: true,
        },
      },
    ],
    connection: 'default',
    name: 'article',
    description: '',
    collectionName: '',
  },
  tag: {
    attributes: [
      {
        name: 'name',
        params: {
          multiple: false,
          type: 'string',
        },
      },
      {
        name: 'articles',
        params: {
          dominant: true,
          nature: 'manyToMany',
          target: 'article',
          key: 'tags',
        },
      },
    ],
    connection: 'default',
    name: 'tag',
    description: '',
    collectionName: '',
  },
  category: {
    attributes: [
      {
        name: 'name',
        params: {
          multiple: false,
          type: 'string',
        },
      },
      {
        name: 'articles',
        params: {
          nature: 'oneToMany',
          target: 'article',
          key: 'category',
        },
      },
    ],
    connection: 'default',
    name: 'category',
    description: '',
    collectionName: '',
  },
  reference: {
    attributes: [
      {
        name: 'name',
        params: {
          multiple: false,
          type: 'string',
        },
      },
      {
        name: 'article',
        params: {
          target: 'article',
          key: 'reference',
          nature: 'oneToOne',
        },
      },
      {
        name: 'tag',
        params: {
          nature: 'oneWay',
          target: 'tag',
        },
      },
    ],
    connection: 'default',
    name: 'reference',
    description: '',
    collectionName: '',
  },
  product: {
    attributes: [
      {
        name: 'name',
        params: {
          multiple: false,
          type: 'string',
        },
      },
      {
        name: 'description',
        params: {
          multiple: false,
          type: 'wysiwyg',
        },
      },
      {
        name: 'published',
        params: {
          multiple: false,
          type: 'boolean',
        },
      },
    ],
    connection: 'default',
    name: 'product',
    description: '',
    collectionName: '',
  },
  articlewithtag: {
    attributes: [
      {
        name: 'title',
        params: {
          multiple: false,
          type: 'string',
        },
      },
      {
        name: 'tags',
        params: {
          nature: 'manyWay',
          target: 'tag',
        },
      },
    ],
    connection: 'default',
    name: 'articlewithtag',
    description: '',
    collectionName: '',
  },
};
