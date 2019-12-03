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
        attributes: {
          meta: {
            type: 'string',
            required: true,
            default: 'title',
          },
          value: {
            type: 'text',
            required: true,
            default: 'A title',
          },
        },
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
        attributes: {
          quote: {
            type: 'text',
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
          attributes: {
            name: {
              type: 'string',
            },
            testContentType: {
              dominant: null,
              columnName: null,
              nature: 'oneWay',
              targetAttribute: '-',
              target: 'application::test-content-type.test-content-type',
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
      },
      'default.nested-compo': {
        uid: 'default.nested-compo',
        isTemporary: true,
        category: 'default',
        schema: {
          name: 'nestedCompo',
          icon: 'address-book',
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
          attributes: {
            meta: {
              type: 'string',
              required: true,
              default: 'title',
            },
            value: {
              type: 'text',
              required: true,
              default: 'A title',
            },
          },
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
    },
    // TODO add test for component
    // componentToCreate: {

    // },
    contentTypeToCreate: {
      uid: 'application::test-content-type.test-content-type',
      isTemporary: true,
      schema: {
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
            targetAttribute: '-',
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
            target: 'application::test-content-type.test-content-type',
            unique: false,
            targetColumnName: null,
            required: false,
          },
          testContentType: {
            nature: 'manyToOne',
            target: 'application::test-content-type.test-content-type',
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
    },
    contentTypeToEdit: {
      uid: 'application::test-content-type.test-content-type',
      schema: {
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
            targetAttribute: '-',
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
            target: 'application::test-content-type.test-content-type',
            unique: false,
            targetColumnName: null,
            required: false,
          },
          testContentType: {
            nature: 'manyToOne',
            target: 'application::test-content-type.test-content-type',
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
    },
  },
};

export default data;
