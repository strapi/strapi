const expectedData = {
  contentType: {
    name: 'test content type',
    collectionName: 'test-content-types',
    connection: 'default',
    description: '',
    attributes: {
      name: {
        type: 'string',
      },
      address: {
        dominant: null,
        columnName: null,
        nature: 'oneWay',
        targetAttribute: null,
        target: 'application::address.address',
        unique: false,
        targetColumnName: null,
        required: false,
      },
      testContentTypes: {
        dominant: null,
        columnName: null,
        nature: 'oneToMany',
        targetAttribute: 'testContentType',
        target: '__self__',
        unique: false,
        targetColumnName: null,
        required: false,
      },
      testContentType: {
        nature: 'manyToOne',
        target: '__self__',
        unique: false,
        required: false,
        dominant: null,
        targetAttribute: 'testContentTypes',
        columnName: null,
        targetColumnName: null,
      },
      mainCompoField: {
        type: 'component',
        repeatable: false,
        component: 'components.main-compo',
      },
      existingCompo: {
        type: 'component',
        repeatable: true,
        component: 'default.metas',
      },
      quote: {
        type: 'component',
        repeatable: false,
        component: 'blog.quote',
      },
    },
  },
  componentsToFormat: [
    'components.main-compo',
    'default.nested-compo',
    'blog.quote',
  ],

  components: [
    {
      tmpUID: 'components.main-compo',
      name: 'mainCompo',
      icon: 'ad',
      category: 'components',
      attributes: {
        name: {
          type: 'string',
        },
        testContentType: {
          dominant: null,
          columnName: null,
          nature: 'oneWay',
          targetAttribute: null,
          target: '__contentType__',
          unique: false,
          targetColumnName: null,
          required: false,
        },
        subCompoField: {
          type: 'component',
          repeatable: false,
          component: 'default.nested-compo',
        },
      },
    },
    {
      tmpUID: 'default.nested-compo',
      name: 'nestedCompo',
      icon: 'address-book',
      category: 'default',
      attributes: {
        name: {
          type: 'string',
        },
        email: {
          type: 'email',
          default: null,
        },
      },
    },
    {
      uid: 'blog.quote',
      category: 'blog',
      name: 'quote',
      description: '',
      icon: 'anchor',
      connection: 'default',
      collectionName: 'components_quotes',
      attributes: {
        quote: {
          type: 'string',
          required: true,
        },
        author: {
          model: 'user',
          plugin: 'users-permissions',
        },
        link_to_biography: {
          type: 'string',
          required: true,
        },
      },
    },
  ],
  formattedComponents: {
    'components.main-compo': {
      tmpUID: 'components.main-compo',
      name: 'mainCompo',
      icon: 'ad',
      category: 'components',
      attributes: {
        name: {
          type: 'string',
        },
        testContentType: {
          dominant: null,
          columnName: null,
          nature: 'oneWay',
          targetAttribute: null,
          target: '__contentType__',
          unique: false,
          targetColumnName: null,
          required: false,
        },
        subCompoField: {
          type: 'component',
          repeatable: false,
          component: 'default.nested-compo',
        },
      },
    },
    'default.nested-compo': {
      tmpUID: 'default.nested-compo',
      name: 'nestedCompo',
      icon: 'address-book',
      category: 'default',
      attributes: {
        name: {
          type: 'string',
        },
        email: {
          type: 'email',
          default: null,
        },
      },
    },
    'blog.quote': {
      uid: 'blog.quote',
      category: 'blog',
      name: 'quote',
      description: '',
      icon: 'anchor',
      connection: 'default',
      collectionName: 'components_quotes',
      attributes: {
        quote: {
          type: 'string',
          required: true,
        },
        author: {
          model: 'user',
          plugin: 'users-permissions',
        },
        link_to_biography: {
          type: 'string',
          required: true,
        },
      },
    },
  },
};

export default expectedData;

// components: [
//   {
//     tmpUID: 'components.main-compo',
//     name: 'mainCompo',
//     icon: 'ad',
//     category: 'components',
//     attributes: {
//       name: {
//         type: 'string',
//       },
//       testContentType: {
//         dominant: null,
//         columnName: null,
//         nature: 'oneWay',
//         targetAttribute: null,
//         target: '__contentType__',
//         unique: false,
//         targetColumnName: null,
//         required: false,
//       },
//       subCompoField: {
//         type: 'component',
//         repeatable: false,
//         component: 'default.nested-compo',
//       },
//     },
//   },
//   {
//     tmpUID: 'default.nested-compo',
//     name: 'nestedCompo',
//     icon: 'address-book',
//     category: 'default',
//     attributes: {
//       name: {
//         type: 'string',
//       },
//       email: {
//         type: 'email',
//         default: null,
//       },
//     },
//   },
//   {
//     uid: 'blog.quote',
//     category: 'blog',
//     name: 'quote',
//     description: '',
//     icon: 'anchor',
//     connection: 'default',
//     collectionName: 'components_quotes',
//     attributes: {
//       quote: {
//         type: 'string',
//         required: true,
//       },
//       author: {
//         model: 'user',
//         plugin: 'users-permissions',
//       },
//       link_to_biography: {
//         type: 'string',
//         required: true,
//       },
//     },
//   },
// ],
