const expectedData = {
  contentTypeToCreate: {
    displayName: 'test content type',
    description: '',
    attributes: {
      name: {
        type: 'string',
      },
      address: {
        relation: 'oneToOne',
        target: 'api::address.address',
        // targetAttribute: null,
        type: 'relation',
      },
      testContentTypes: {
        relation: 'oneToMany',
        targetAttribute: 'testContentType',
        target: 'api::test-content-type.test-content-type',
        type: 'relation',
      },
      testContentType: {
        relation: 'manyToOne',
        target: 'api::test-content-type.test-content-type',
        targetAttribute: 'testContentTypes',
        type: 'relation',
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
      someCustomField: {
        customField: 'plugin::test.test',
        type: 'customField',
      },
    },
  },
  contentTypeToEdit: {
    displayName: 'test content type',
    description: '',
    attributes: {
      name: {
        type: 'string',
      },
      address: {
        relation: 'oneToOne',
        target: 'api::address.address',
        type: 'relation',
      },
      testContentTypes: {
        relation: 'oneToMany',
        targetAttribute: 'testContentType',
        target: 'api::test-content-type.test-content-type',
        type: 'relation',
      },
      testContentType: {
        relation: 'manyToOne',
        target: 'api::test-content-type.test-content-type',
        targetAttribute: 'testContentTypes',
        type: 'relation',
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
      someCustomField: {
        customField: 'plugin::test.test',
        type: 'customField',
      },
    },
  },
  componentsToFormat: ['components.main-compo', 'default.nested-compo', 'blog.quote'],
  sortedContentTypes: [
    {
      uid: 'plugin::myplugins.atest',
      name: 'plugin::myplugins.atest',
      title: 'plugin::myplugins.atest',
      to: '/plugins/content-type-builder/content-types/plugin::myplugins.atest',
      kind: 'collectionType',
      visible: true,
      plugin: null,
      restrictRelationsTo: [],
    },
    {
      uid: 'plugin::myplugins.btest',
      name: 'plugin::myplugins.btest',
      title: 'plugin::myplugins.btest',
      to: '/plugins/content-type-builder/content-types/plugin::myplugins.btest',
      kind: 'collectionType',
      visible: true,
      plugin: null,
      restrictRelationsTo: null,
    },
    {
      uid: 'plugin::myplugins.ctest',
      name: 'plugin::myplugins.ctest',
      title: 'plugin::myplugins.ctest',
      to: '/plugins/content-type-builder/content-types/plugin::myplugins.ctest',
      kind: 'collectionType',
      visible: true,
      plugin: null,
      restrictRelationsTo: ['oneWay'],
    },
    {
      uid: 'plugin::myplugins.test',
      name: 'plugin::myplugins.test',
      title: 'plugin::myplugins.test',
      to: '/plugins/content-type-builder/content-types/plugin::myplugins.test',
      kind: 'singleType',
      visible: true,
      plugin: null,
      restrictRelationsTo: null,
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
          relation: 'oneToOne',
          target: 'api::test-content-type.test-content-type',
          type: 'relation',
        },
        subCompoField: {
          type: 'component',
          repeatable: false,
          component: 'default.nested-compo',
        },
        someCustomField: {
          customField: 'plugin::test.test',
          type: 'customField',
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
          relation: 'oneToOne',
          target: 'api::test-content-type.test-content-type',
          type: 'relation',
        },
        subCompoField: {
          type: 'component',
          repeatable: false,
          component: 'default.nested-compo',
        },
        someCustomField: {
          customField: 'plugin::test.test',
          type: 'customField',
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
          relation: 'oneToOne',
          target: 'api::test-content-type.test-content-type',
          type: 'relation',
        },
        subCompoField: {
          type: 'component',
          repeatable: false,
          component: 'default.nested-compo',
        },
        someCustomField: {
          customField: 'plugin::test.test',
          type: 'customField',
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
          relation: 'oneToOne',
          target: 'api::test-content-type.test-content-type',
          type: 'relation',
        },
        subCompoField: {
          type: 'component',
          repeatable: false,
          component: 'default.nested-compo',
        },
        someCustomField: {
          customField: 'plugin::test.test',
          type: 'customField',
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
        link_to_biography: {
          type: 'string',
          required: true,
        },
      },
    },
  },
};

export default expectedData;
