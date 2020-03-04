const data = {
  homeSingleType: {
    contentType: {
      uid: 'plugins::myplugins.home',
      schema: {
        name: 'plugins::myplugins.home',
        kind: 'singleType',
        attributes: {
          category: { nature: 'oneWay' },
          address: { type: 'string' },
        },
      },
    },
  },
  articleContentType: {
    contentType: {
      uid: 'plugins::myplugins.article',
      schema: {
        name: 'plugins::myplugins.article',
        kind: 'collectionType',
        attributes: {
          user: { nature: 'manyToOne' },
          title: { type: 'string' },
        },
      },
    },
  },
  postContentType: {
    contentType: {
      uid: 'plugins::myplugins.post',
      schema: {
        name: 'plugins::myplugins.post',
        kind: 'collectionType',
        attributes: {
          user: { nature: 'manyWay' },
          title: { type: 'string' },
        },
      },
    },
  },
};

export default data;
