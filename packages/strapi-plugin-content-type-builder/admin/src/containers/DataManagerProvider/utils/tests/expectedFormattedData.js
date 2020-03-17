const expectedData = {
  contentTypeToCreate: {
    name: 'test content type',
    collectionName: 'test-content-types',
    connection: 'default',
    description: '',
    attributes: {
      name: {
        type: 'string',
      },
      address: {
        nature: 'oneWay',
        target: 'application::address.address',
        unique: false,
        required: false,
      },
      testContentTypes: {
        nature: 'oneToMany',
        targetAttribute: 'testContentType',
        target: '__self__',
        unique: false,
        required: false,
      },
      testContentType: {
        nature: 'manyToOne',
        target: '__self__',
        unique: false,
        required: false,
        targetAttribute: 'testContentTypes',
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
  contentTypeToEdit: {
    name: 'test content type',
    collectionName: 'test-content-types',
    connection: 'default',
    description: '',
    attributes: {
      name: {
        type: 'string',
      },
      address: {
        nature: 'oneWay',
        target: 'application::address.address',
        unique: false,
        required: false,
      },
      testContentTypes: {
        nature: 'oneToMany',
        targetAttribute: 'testContentType',
        target: 'application::test-content-type.test-content-type',
        unique: false,
        required: false,
      },
      testContentType: {
        nature: 'manyToOne',
        target: 'application::test-content-type.test-content-type',
        unique: false,
        required: false,
        targetAttribute: 'testContentTypes',
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
  sortedContentTypes: [
    {
      uid: 'plugins::myplugins.atest',
      name: 'plugins::myplugins.atest',
      title: 'plugins::myplugins.atest',
      to:
        '/plugins/content-type-builder/content-types/plugins::myplugins.atest',
      kind: 'collectionType',
    },
    {
      uid: 'plugins::myplugins.btest',
      name: 'plugins::myplugins.btest',
      title: 'plugins::myplugins.btest',
      to:
        '/plugins/content-type-builder/content-types/plugins::myplugins.btest',
      kind: 'collectionType',
    },
    {
      uid: 'plugins::myplugins.ctest',
      name: 'plugins::myplugins.ctest',
      title: 'plugins::myplugins.ctest',
      to:
        '/plugins/content-type-builder/content-types/plugins::myplugins.ctest',
      kind: 'collectionType',
    },
    {
      uid: 'plugins::myplugins.test',
      name: 'plugins::myplugins.test',
      title: 'plugins::myplugins.test',
      to: '/plugins/content-type-builder/content-types/plugins::myplugins.test',
      kind: 'singleType',
    },
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
          nature: 'oneWay',
          target: '__contentType__',
          unique: false,
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
        },
        link_to_biography: {
          type: 'string',
          required: true,
        },
      },
    },
  ],
  componentsForEdit: [
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
          nature: 'oneWay',
          target: 'application::test-content-type.test-content-type',
          unique: false,
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
          nature: 'oneWay',
          target: '__contentType__',
          unique: false,
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
        },
        link_to_biography: {
          type: 'string',
          required: true,
        },
      },
    },
  },
  formattedComponentsForEdit: {
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
          nature: 'oneWay',
          target: 'application::test-content-type.test-content-type',
          unique: false,
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
