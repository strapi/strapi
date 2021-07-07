const data = {
  components: {
    'default.closingperiod': {
      uid: 'default.closingperiod',
      category: '',
      schema: {
        icon: 'angry',
        name: 'closingperiod',
        description: '',
        connection: 'default',
        collectionName: 'components_closingperiods',
        attributes: {
          label: {
            type: 'string',
          },
          start_date: {
            type: 'date',
            required: true,
          },
          end_date: {
            type: 'date',
            required: true,
          },
          media: {
            type: 'media',
            multiple: false,
            required: false,
          },
          dish: {
            component: 'default.dish',
            type: 'component',
          },
        },
      },
    },
    'default.dish': {
      uid: 'default.dish',
      category: 'default',
      schema: {
        icon: 'book',
        name: 'dish',
        description: '',
        connection: 'default',
        collectionName: 'components_dishes',
        attributes: {
          name: {
            type: 'string',
            required: true,
            default: 'My super dish',
          },
          description: {
            type: 'text',
          },
          price: {
            type: 'float',
          },
          picture: {
            type: 'media',
            multiple: false,
            required: false,
          },
          very_long_description: {
            type: 'richtext',
          },
          category: {
            relation: 'oneToOne',
            target: 'application::category.category',
            targetAttribute: null,
            type: 'relation',
          },
        },
      },
    },
    'default.openingtimes': {
      uid: 'default.openingtimes',
      category: 'default',
      schema: {
        icon: 'calendar',
        name: 'openingtimes',
        description: '',
        connection: 'default',
        collectionName: 'components_openingtimes',
        attributes: {
          label: {
            type: 'string',
            required: true,
            default: 'something',
          },
          time: {
            type: 'string',
          },
        },
      },
    },
    'default.restaurantservice': {
      uid: 'default.restaurantservice',
      category: 'default',
      schema: {
        icon: 'strapi',
        name: 'restaurantservice',
        description: '',
        connection: 'default',
        collectionName: 'components_restaurantservices',
        attributes: {
          name: {
            type: 'string',
            required: true,
            default: 'something',
          },
          media: {
            type: 'media',
            multiple: false,
            required: false,
          },
          is_available: {
            type: 'boolean',
            required: true,
            default: true,
          },
        },
      },
    },
  },
  contentTypes: {
    'plugins::myplugin.test': {
      uid: '',
      plugin: 'myplugin',
      schema: {
        name: 'test',
        description: '',
        connection: 'default',
        collectionName: 'myplugin_test',
        attributes: {
          type: {
            type: 'string',
            required: true,
            unique: true,
            configurable: true,
          },
        },
      },
    },
    'plugins::users-permissions.role': {
      uid: 'plugins::users-permissions.role',
      plugin: 'users-permissions',
      schema: {
        name: 'role',
        description: '',
        connection: 'default',
        collectionName: '',
        attributes: {
          name: {
            type: 'string',
            minLength: 3,
            required: true,
            configurable: false,
          },
          description: { type: 'string', configurable: false },
          type: { type: 'string', unique: true, configurable: false },
          permissions: {
            relation: 'oneToMany',
            target: 'plugins::users-permissions.permission',
            plugin: 'users-permissions',
            targetAttribute: 'role',
            configurable: false,
            type: 'relation',
          },
          users: {
            relation: 'oneToMany',
            target: 'plugins::users-permissions.user',
            plugin: 'users-permissions',
            type: 'relation',
            targetAttribute: 'role',
          },
        },
      },
    },
    'application::address.address': {
      uid: 'application::address.address',
      schema: {
        name: 'address',
        description: '',
        connection: 'default',
        collectionName: '',
        attributes: {
          geolocation: { type: 'json', required: true },
          city: { type: 'string', required: true },
          postal_coder: { type: 'string' },
          category: {
            relation: 'oneToOne',
            target: 'application::category.category',
            targetAttribute: null,
            type: 'relation',
          },
          cover: { type: 'media', multiple: false, required: false },
          images: { type: 'media', multiple: true, required: false },
          full_name: { type: 'string', required: true },
        },
      },
    },
    'application::menusection.menusection': {
      uid: 'application::menusection.menusection',
      schema: {
        name: 'menusection',
        description: '',
        connection: 'default',
        collectionName: '',
        attributes: {
          name: { type: 'string', required: true, minLength: 6 },
          dishes: {
            component: 'default.dish',
            type: 'component',
            repeatable: true,
          },
          menu: {
            relation: 'manyToOne',
            target: 'application::menu.menu',
            targetAttribute: 'menusections',
            type: 'relation',
          },
        },
      },
    },
    'application::country.country': {
      uid: 'application::country.country',
      schema: {
        name: 'country',
        description: '',
        connection: 'default',
        collectionName: '',
        attributes: {
          name: { type: 'string', required: true, minLength: 3 },
          code: { type: 'string', maxLength: 3, unique: true, minLength: 2 },
        },
      },
    },
    'plugins::users-permissions.user': {
      uid: 'plugins::users-permissions.user',
      plugin: 'users-permissions',
      schema: {
        name: 'users',
        description: '',
        connection: 'default',
        collectionName: '',
        attributes: {
          username: {
            type: 'string',
            minLength: 3,
            unique: true,
            configurable: false,
            required: true,
          },
          email: {
            type: 'email',
            minLength: 6,
            configurable: false,
            required: true,
          },
          provider: { type: 'string', configurable: false },
          password: {
            type: 'password',
            minLength: 6,
            configurable: false,
            private: true,
          },
          resetPasswordToken: {
            type: 'string',
            configurable: false,
            private: true,
          },
          confirmed: { type: 'boolean', default: false, configurable: false },
          blocked: { type: 'boolean', default: false, configurable: false },
          role: {
            relation: 'manyToOne',
            target: 'plugins::users-permissions.role',
            plugin: 'users-permissions',
            targetAttribute: 'users',
            type: 'relation',
          },
          picture: { type: 'media', multiple: false, required: false },
        },
      },
    },
    'application::review.review': {
      uid: 'application::review.review',
      schema: {
        name: 'review',
        description: '',
        connection: 'default',
        collectionName: '',
        attributes: {
          comment: { type: 'text', required: true },
          rating: { type: 'integer', required: true, min: 1, max: 5 },
          likes: {
            relation: 'oneToMany',
            target: 'application::like.like',
            targetAttribute: 'review',
            type: 'relation',
          },
          author: {
            relation: 'oneToOne',
            target: 'plugins::users-permissions.user',
            targetAttribute: null,
            plugin: 'users-permissions',
            type: 'relation',
          },
          restaurant: {
            relation: 'oneToOne',
            target: 'application::restaurant.restaurant',
            targetAttribute: null,
            type: 'relation',
          },
        },
      },
    },
    'application::like.like': {
      uid: 'application::like.like',
      schema: {
        name: 'like',
        description: '',
        connection: 'default',
        collectionName: '',
        attributes: {
          author: {
            relation: 'oneToOne',
            target: 'plugins::users-permissions.user',
            targetAttribute: null,
            plugin: 'users-permissions',
            type: 'relation',
          },
          review: {
            relation: 'manyToOne',
            target: 'application::review.review',
            targetAttribute: 'likes',
            type: 'relation',
          },
        },
      },
    },
    'application::category.category': {
      uid: 'application::category.category',
      schema: {
        name: 'category',
        description: '',
        connection: 'default',
        collectionName: '',
        attributes: {
          name: { type: 'string' },
        },
      },
    },
    'plugins::users-permissions.permission': {
      uid: 'plugins::users-permissions.permission',
      plugin: 'users-permissions',
      schema: {
        name: 'permission',
        description: '',
        connection: 'default',
        collectionName: '',
        attributes: {
          type: { type: 'string', required: true, configurable: false },
          controller: { type: 'string', required: true, configurable: false },
          action: { type: 'string', required: true, configurable: false },
          enabled: { type: 'boolean', required: true, configurable: false },
          policy: { type: 'string', configurable: false },
          role: {
            relation: 'manyToOne',
            target: 'plugins::users-permissions.role',
            plugin: 'users-permissions',
            targetAttribute: 'permissions',
            type: 'relation',
          },
        },
      },
    },
    'application::menu.menu': {
      uid: 'application::menu.menu',
      schema: {
        name: 'menu',
        description: '',
        connection: 'default',
        collectionName: '',
        attributes: {
          description: { type: 'text' },
          menusections: {
            relation: 'oneToMany',
            target: 'application::menusection.menusection',
            targetAttribute: 'menu',
            type: 'relation',
          },
          restaurant: {
            nature: 'oneToOne',
            target: 'application::restaurant.restaurant',
            targetAttribute: 'menu',
            type: 'relation',
          },
        },
      },
    },
    'application::restaurant.restaurant': {
      uid: 'application::restaurant.restaurant',
      schema: {
        name: 'restaurant',
        description: '',
        connection: 'default',
        collectionName: '',
        attributes: {
          price_range: {
            enum: ['very_cheap', 'cheap', 'average', 'expensive', 'very_expensive'],
            type: 'enumeration',
          },
          closing_period: {
            component: 'default.closingperiod',
            type: 'component',
          },
          name: { maxLength: 50, required: true, minLength: 5, type: 'string' },
          address: {
            relation: 'oneToOne',
            target: 'application::address.address',
            targetAttribute: null,
            type: 'relation',
          },
          cover: { type: 'media', multiple: false, required: false },
          images: { type: 'media', multiple: true, required: false },
          short_description: { type: 'text' },
          since: { type: 'date' },
          categories: {
            relation: 'oneToMany',
            target: 'application::category.category',
            targetAttribute: null,
            type: 'relation',
          },
          description: { type: 'richtext', required: true },
          services: {
            component: 'default.restaurantservice',
            repeatable: true,
            type: 'component',
          },
          menu: {
            nature: 'oneToOne',
            target: 'application::menu.menu',
            dominant: false,
            targetAttribute: 'restaurant',
            unique: false,
          },
          opening_times: {
            component: 'default.openingtimes',
            type: 'component',
            repeatable: true,
            min: 1,
            max: 10,
          },
          dz: {
            type: 'dynamiczone',
            components: [
              'default.closingperiod',
              'default.dish',
              'default.openingtimes',
              'default.restaurantservice',
            ],
          },
        },
      },
    },
    'application::homepage.homepage': {
      uid: 'application::homepage.homepage',
      schema: {
        name: 'homepage',
        attributes: {
          title: { type: 'string' },
          description: { type: 'string' },
          homepageuidfield: { type: 'uid', targetField: 'description' },
        },
      },
    },
  },
};

export default data;
