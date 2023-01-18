const data = {
  initialComponents: {
    'default.metas': {
      uid: 'default.metas',
      category: 'default',
      schema: {
        icon: 'angry',
        name: 'metas',
        description: '',
        connection: 'default',
        collectionName: 'components_metas',
        attributes: [
          {
            name: 'meta',
            type: 'string',
            required: true,
            default: 'title',
          },
          {
            name: 'value',
            type: 'text',
            required: true,
            default: 'A title',
          },
        ],
      },
    },
    'blog.quote': {
      uid: 'blog.quote',
      category: 'blog',
      schema: {
        name: 'quote',
        description: '',
        icon: 'anchor',
        connection: 'default',
        collectionName: 'components_quotes',
        attributes: [
          {
            name: 'quote',
            type: 'text',
            required: true,
          },

          {
            name: 'link_to_biography',
            type: 'string',
            required: true,
          },
        ],
      },
    },
  },
  rawData: {
    components: {
      'components.main-compo': {
        uid: 'components.main-compo',
        isTemporary: true,
        category: 'components',
        schema: {
          name: 'mainCompo',
          icon: 'ad',
          attributes: [
            {
              name: 'name',
              type: 'string',
            },
            {
              name: 'testContentType',
              relation: 'oneToOne',
              targetAttribute: null,
              target: 'api::test-content-type.test-content-type',
              type: 'relation',
            },
            {
              name: 'subCompoField',
              type: 'component',
              repeatable: false,
              component: 'default.nested-compo',
            },
            {
              name: 'someCustomField',
              type: 'string',
              customField: 'plugin::test.test',
            },
          ],
        },
      },
      'default.nested-compo': {
        uid: 'default.nested-compo',
        isTemporary: true,
        category: 'default',
        schema: {
          name: 'nestedCompo',
          icon: 'address-book',
          attributes: [
            {
              name: 'name',
              type: 'string',
            },
            {
              name: 'email',
              type: 'email',
              default: null,
            },
          ],
        },
      },
      'default.metas': {
        uid: 'default.metas',
        category: 'default',
        schema: {
          icon: 'angry',
          name: 'metas',
          description: '',
          connection: 'default',
          collectionName: 'components_metas',
          attributes: [
            {
              name: 'meta',
              type: 'string',
              required: true,
              default: 'title',
            },
            {
              name: 'value',
              type: 'text',
              required: true,
              default: 'A title',
            },
          ],
        },
      },
      'blog.quote': {
        uid: 'blog.quote',
        category: 'blog',
        schema: {
          name: 'quote',
          description: '',
          icon: 'anchor',
          connection: 'default',
          collectionName: 'components_quotes',
          attributes: [
            {
              name: 'quote',
              type: 'string',
              required: true,
            },
            {
              name: 'link_to_biography',
              type: 'string',
              required: true,
            },
          ],
        },
      },
    },
    contentTypesToSort: {
      'plugin::myplugins.test': {
        uid: 'plugin::myplugins.test',
        schema: {
          displayName: 'plugin::myplugins.test',
          kind: 'singleType',
          visible: true,
          restrictRelationsTo: null,
        },
      },
      'plugin::myplugins.btest': {
        uid: 'plugin::myplugins.btest',
        schema: {
          displayName: 'plugin::myplugins.btest',
          kind: 'collectionType',
          visible: true,
          restrictRelationsTo: null,
        },
      },
      'plugin::myplugins.atest': {
        uid: 'plugin::myplugins.atest',
        schema: {
          displayName: 'plugin::myplugins.atest',
          kind: 'collectionType',
          visible: true,
          restrictRelationsTo: [],
        },
      },
      'plugin::myplugins.ctest': {
        uid: 'plugin::myplugins.ctest',
        schema: {
          displayName: 'plugin::myplugins.ctest',
          kind: 'collectionType',
          visible: true,
          restrictRelationsTo: ['oneWay'],
        },
      },
    },

    contentTypeToCreate: {
      uid: 'api::test-content-type.test-content-type',
      isTemporary: true,
      schema: {
        displayName: 'test content type',

        description: '',
        attributes: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'address',
            relation: 'oneToOne',
            targetAttribute: null,
            target: 'api::address.address',
            type: 'relation',
          },
          {
            name: 'testContentTypes',
            relation: 'oneToMany',
            targetAttribute: 'testContentType',
            target: 'api::test-content-type.test-content-type',
            type: 'relation',
          },
          {
            name: 'testContentType',
            relation: 'manyToOne',
            target: 'api::test-content-type.test-content-type',
            targetAttribute: 'testContentTypes',
            type: 'relation',
          },
          {
            name: 'mainCompoField',
            type: 'component',
            repeatable: false,
            component: 'components.main-compo',
          },
          {
            name: 'existingCompo',
            type: 'component',
            repeatable: true,
            component: 'default.metas',
          },
          {
            name: 'quote',
            type: 'component',
            repeatable: false,
            component: 'blog.quote',
          },
          {
            name: 'someCustomField',
            type: 'string',
            customField: 'plugin::test.test',
          },
        ],
      },
    },
    contentTypeToEdit: {
      uid: 'api::test-content-type.test-content-type',
      schema: {
        displayName: 'test content type',

        description: '',
        attributes: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'address',
            relation: 'oneToOne',
            targetAttribute: null,
            target: 'api::address.address',
            type: 'relation',
          },
          {
            name: 'testContentTypes',
            relation: 'oneToMany',
            targetAttribute: 'testContentType',
            target: 'api::test-content-type.test-content-type',
            type: 'relation',
          },
          {
            name: 'testContentType',
            relation: 'manyToOne',
            target: 'api::test-content-type.test-content-type',
            targetAttribute: 'testContentTypes',
            type: 'relation',
          },
          {
            name: 'mainCompoField',
            type: 'component',
            repeatable: false,
            component: 'components.main-compo',
          },
          {
            name: 'existingCompo',
            type: 'component',
            repeatable: true,
            component: 'default.metas',
          },
          {
            name: 'quote',
            type: 'component',
            repeatable: false,
            component: 'blog.quote',
          },
          {
            name: 'someCustomField',
            type: 'string',
            customField: 'plugin::test.test',
          },
        ],
      },
    },
  },
};

export default data;
