const data = {
  homeSingleType: {
    contentType: {
      uid: 'plugin::myplugins.home',
      schema: {
        name: 'plugin::myplugins.home',
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
      },
    },
  },
  articleContentType: {
    contentType: {
      uid: 'plugin::myplugins.article',
      schema: {
        name: 'plugin::myplugins.article',
        kind: 'collectionType',
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
      },
    },
  },
  postContentType: {
    contentType: {
      uid: 'plugin::myplugins.post',
      schema: {
        name: 'plugin::myplugins.post',
        kind: 'collectionType',
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
      },
    },
  },
};

export default data;
