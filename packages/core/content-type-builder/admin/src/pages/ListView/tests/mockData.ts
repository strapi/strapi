export default {
  contentType: {
    uid: 'api::address.address',
    apiID: 'address',
    schema: {
      name: 'Address',
      description: '',
      draftAndPublish: false,
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      kind: 'collectionType',
      collectionName: 'addresses',
      attributes: [
        {
          type: 'string',
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          name: 'postal_code',
        },
        {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::category.category',
          inversedBy: 'addresses',
          targetAttribute: 'addresses',
          private: false,
          name: 'categories',
        },
        {
          type: 'media',
          multiple: false,
          required: false,
          allowedTypes: ['files', 'images', 'videos', 'audios'],
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          name: 'cover',
        },
        {
          type: 'media',
          multiple: true,
          required: false,
          allowedTypes: ['images'],
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          name: 'images',
        },
        {
          type: 'string',
          required: true,
          maxLength: 200,
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          name: 'city',
        },
        {
          type: 'json',
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          name: 'json',
        },
        {
          type: 'uid',
          targetField: 'city',
          name: 'slug',
        },
        {
          type: 'component',
          repeatable: false,
          pluginOptions: {
            i18n: {
              localized: false,
            },
          },
          component: 'blog.test-como',
          required: true,
          name: 'notrepeat_req',
        },
        {
          type: 'component',
          repeatable: false,
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          component: 'basic.compopo',
          name: 'Compopo',
        },
        {
          pluginOptions: {
            i18n: {
              localized: true,
            },
          },
          type: 'dynamiczone',
          components: [
            'basic.compo',
            'default.dish',
            'default.openingtimes',
            'default.restaurantservice',
          ],
          name: 'DynamicZone',
        },
      ],
      visible: true,
      restrictRelationsTo: null,
    },
  },
  components: {
    'blog.test-como': {
      uid: 'blog.test-como',
      category: 'blog',
      apiId: 'test-como',
      schema: {
        icon: 'ad',
        name: 'test comp',
        description: '',
        collectionName: 'components_blog_test_comos',
        attributes: [
          {
            type: 'string',
            default: 'toto',
            name: 'name',
          },
          {
            type: 'string',
            name: 'popo',
          },
          {
            type: 'string',
            name: 'poq',
          },
        ],
      },
    },
    'basic.compopo': {
      uid: 'basic.compopo',
      category: 'basic',
      apiId: 'compopo',
      schema: {
        icon: 'allergies',
        name: 'Compopo',
        description: '',
        collectionName: 'components_basic_compopos',
        attributes: [
          {
            type: 'string',
            name: 'dede',
          },
          {
            type: 'string',
            name: 'dada',
          },
          {
            type: 'string',
            name: 'papi',
          },
        ],
      },
    },
    'basic.compo': {
      uid: 'basic.compo',
      category: 'basic',
      apiId: 'compo',
      schema: {
        icon: 'adjust',
        name: 'Compo',
        description: '',
        collectionName: 'components_basic_compos',
        attributes: [
          {
            type: 'string',
            name: 'name',
          },
          {
            type: 'email',
            name: 'mail',
          },
          {
            type: 'integer',
            name: 'phone',
          },
        ],
      },
    },
    'default.dish': {
      uid: 'default.dish',
      category: 'default',
      apiId: 'dish',
      schema: {
        icon: 'address-book',
        name: 'dish',
        description: '',
        collectionName: 'components_dishes',
        attributes: [
          {
            type: 'string',
            required: false,
            default: 'My super dish',
            name: 'name',
          },
          {
            type: 'text',
            name: 'description',
          },
          {
            type: 'float',
            name: 'price',
          },
          {
            type: 'media',
            multiple: false,
            required: false,
            name: 'picture',
          },
          {
            type: 'richtext',
            name: 'very_long_description',
          },
          {
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::category.category',
            targetAttribute: null,
            private: false,
            name: 'categories',
          },
        ],
      },
    },
    'default.openingtimes': {
      uid: 'default.openingtimes',
      category: 'default',
      apiId: 'openingtimes',
      schema: {
        icon: 'calendar',
        name: 'openingtimes',
        description: '',
        collectionName: 'components_openingtimes',
        attributes: [
          {
            type: 'string',
            required: true,
            default: 'something',
            name: 'label',
          },
          {
            type: 'string',
            name: 'time',
          },
          {
            type: 'component',
            repeatable: true,
            component: 'default.dish',
            name: 'dishrep',
          },
        ],
      },
    },
    'default.restaurantservice': {
      uid: 'default.restaurantservice',
      category: 'default',
      apiId: 'restaurantservice',
      schema: {
        icon: 'cannabis',
        name: 'restaurantservice',
        description: '',
        collectionName: 'components_restaurantservices',
        attributes: [
          {
            type: 'string',
            required: true,
            default: 'something',
            name: 'name',
          },
          {
            type: 'media',
            multiple: false,
            required: false,
            name: 'media',
          },
          {
            type: 'boolean',
            required: true,
            default: true,
            name: 'is_available',
          },
        ],
      },
    },
  },
};
