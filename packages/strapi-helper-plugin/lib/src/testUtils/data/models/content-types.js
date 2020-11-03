const collectionTypes = [
  {
    uid: 'application::address.address',
    isDisplayed: true,
    apiID: 'address',
    kind: 'collectionType',
    info: {
      name: 'address',
      description: '',
      label: 'Addresses',
    },
    options: {
      draftAndPublish: true,
      increments: true,
      timestamps: ['created_at', 'updated_at'],
      comment: '',
    },
    attributes: {
      id: {
        type: 'integer',
      },
      postal_coder: {
        type: 'string',
      },
      categories: {
        collection: 'category',
        via: 'addresses',
        dominant: true,
        attribute: 'category',
        column: 'id',
        isVirtual: true,
        type: 'relation',
        targetModel: 'application::category.category',
        relationType: 'manyToMany',
      },
      cover: {
        type: 'media',
        multiple: false,
        required: false,
        allowedTypes: ['files', 'images', 'videos'],
      },
      images: {
        type: 'media',
        multiple: true,
        required: false,
        allowedTypes: ['images'],
      },
      city: {
        type: 'string',
        required: true,
      },
      likes: {
        collection: 'like',
        via: 'address',
        isVirtual: true,
        type: 'relation',
        targetModel: 'application::like.like',
        relationType: 'oneToMany',
      },
      published_at: {
        type: 'datetime',
        configurable: false,
      },
      created_at: {
        type: 'timestamp',
      },
      updated_at: {
        type: 'timestamp',
      },
    },
  },
  {
    uid: 'application::category.category',
    isDisplayed: true,
    apiID: 'category',
    kind: 'collectionType',
    info: {
      name: 'category',
      description: '',
      label: 'Categories',
    },
    options: {
      draftAndPublish: true,
      increments: true,
      timestamps: ['created_at', 'updated_at'],
      comment: '',
    },
    attributes: {
      id: {
        type: 'integer',
      },
      name: {
        type: 'string',
      },
      addresses: {
        via: 'categories',
        collection: 'address',
        attribute: 'address',
        column: 'id',
        isVirtual: true,
        type: 'relation',
        targetModel: 'application::address.address',
        relationType: 'manyToMany',
      },
      published_at: {
        type: 'datetime',
        configurable: false,
      },
      created_at: {
        type: 'timestamp',
      },
      updated_at: {
        type: 'timestamp',
      },
    },
  },
  {
    uid: 'application::country.country',
    isDisplayed: true,
    apiID: 'country',
    kind: 'collectionType',
    info: {
      name: 'country',
      description: '',
      label: 'Countries',
    },
    options: {
      draftAndPublish: false,
      increments: true,
      timestamps: ['created_at', 'updated_at'],
      comment: '',
    },
    attributes: {
      id: {
        type: 'integer',
      },
      name: {
        type: 'string',
        required: true,
        minLength: 3,
      },
      code: {
        type: 'string',
        maxLength: 3,
        unique: true,
        minLength: 2,
      },
      created_at: {
        type: 'timestamp',
      },
      updated_at: {
        type: 'timestamp',
      },
    },
  },
  {
    uid: 'application::like.like',
    isDisplayed: true,
    apiID: 'like',
    kind: 'collectionType',
    info: {
      name: 'like',
      description: '',
      label: 'Likes',
    },
    options: {
      draftAndPublish: false,
      increments: true,
      timestamps: ['created_at', 'updated_at'],
      comment: '',
    },
    attributes: {
      id: {
        type: 'integer',
      },
      authore: {
        plugin: 'users-permissions',
        model: 'user',
        type: 'relation',
        targetModel: 'plugins::users-permissions.user',
        relationType: 'oneWay',
      },
      review: {
        model: 'review',
        via: 'likes',
        type: 'relation',
        targetModel: 'application::review.review',
        relationType: 'manyToOne',
      },
      address: {
        via: 'likes',
        model: 'address',
        type: 'relation',
        targetModel: 'application::address.address',
        relationType: 'manyToOne',
      },
      created_at: {
        type: 'timestamp',
      },
      updated_at: {
        type: 'timestamp',
      },
    },
  },
  {
    uid: 'application::menu.menu',
    isDisplayed: true,
    apiID: 'menu',
    kind: 'collectionType',
    info: {
      name: 'menu',
      description: '',
      label: 'Menus',
    },
    options: {
      draftAndPublish: false,
      increments: true,
      timestamps: ['created_at', 'updated_at'],
      comment: '',
    },
    attributes: {
      id: {
        type: 'integer',
      },
      description: {
        type: 'text',
      },
      menusections: {
        via: 'menu',
        collection: 'menusection',
        isVirtual: true,
        type: 'relation',
        targetModel: 'application::menusection.menusection',
        relationType: 'oneToMany',
      },
      restaurant: {
        via: 'menu',
        model: 'restaurant',
        type: 'relation',
        targetModel: 'application::restaurant.restaurant',
        relationType: 'oneToOne',
      },
      created_at: {
        type: 'timestamp',
      },
      updated_at: {
        type: 'timestamp',
      },
    },
  },
  {
    uid: 'application::menusection.menusection',
    isDisplayed: true,
    apiID: 'menusection',
    kind: 'collectionType',
    info: {
      name: 'menusection',
      description: '',
      label: 'Menusections',
    },
    options: {
      draftAndPublish: false,
      increments: true,
      timestamps: ['created_at', 'updated_at'],
      comment: '',
    },
    attributes: {
      id: {
        type: 'integer',
      },
      name: {
        type: 'string',
        required: true,
        minLength: 6,
      },
      dishes: {
        component: 'default.dish',
        type: 'component',
        repeatable: true,
        required: true,
      },
      menu: {
        model: 'menu',
        via: 'menusections',
        type: 'relation',
        targetModel: 'application::menu.menu',
        relationType: 'manyToOne',
      },
      created_at: {
        type: 'timestamp',
      },
      updated_at: {
        type: 'timestamp',
      },
    },
  },
  {
    uid: 'application::restaurant.restaurant',
    isDisplayed: true,
    apiID: 'restaurant',
    kind: 'collectionType',
    info: {
      name: 'restaurant',
      description: '',
      label: 'Restaurants',
    },
    options: {
      draftAndPublish: false,
      increments: true,
      timestamps: ['created_at', 'updated_at'],
      comment: '',
    },
    attributes: {
      id: {
        type: 'integer',
      },
      name: {
        maxLength: 50,
        required: true,
        minLength: 5,
        type: 'string',
      },
      slug: {
        type: 'uid',
        targetField: 'name',
      },
      price_range: {
        enum: ['very_cheap', 'cheap', 'average', 'expensive', 'very_expensive'],
        type: 'enumeration',
      },
      closing_period: {
        component: 'default.closingperiod',
        type: 'component',
      },
      contact_email: {
        type: 'email',
      },
      stars: {
        required: true,
        type: 'integer',
        min: 0,
        max: 3,
      },
      averagePrice: {
        type: 'float',
        min: 0,
        max: 35.12,
      },
      address: {
        model: 'address',
        type: 'relation',
        targetModel: 'application::address.address',
        relationType: 'oneWay',
      },
      cover: {
        type: 'media',
        multiple: false,
        required: false,
      },
      timestamp: {
        type: 'timestamp',
      },
      images: {
        type: 'media',
        multiple: true,
        required: false,
      },
      short_description: {
        type: 'text',
      },
      since: {
        type: 'date',
      },
      categories: {
        collection: 'category',
        attribute: 'category',
        column: 'id',
        isVirtual: true,
        type: 'relation',
        targetModel: 'application::category.category',
        relationType: 'manyWay',
      },
      description: {
        type: 'richtext',
        required: true,
        minLength: 10,
      },
      services: {
        component: 'default.restaurantservice',
        repeatable: true,
        type: 'component',
      },
      menu: {
        model: 'menu',
        via: 'restaurant',
        type: 'relation',
        targetModel: 'application::menu.menu',
        relationType: 'oneToOne',
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
          'default.openingtimes',
          'default.restaurantservice',
          'default.closingperiod',
          'default.dish',
        ],
      },
      created_at: {
        type: 'timestamp',
      },
      updated_at: {
        type: 'timestamp',
      },
    },
  },
  {
    uid: 'application::review.review',
    isDisplayed: true,
    apiID: 'review',
    kind: 'collectionType',
    info: {
      name: 'review',
      description: '',
      label: 'Reviews',
    },
    options: {
      draftAndPublish: false,
      increments: true,
      timestamps: ['created_at', 'updated_at'],
      comment: '',
    },
    attributes: {
      id: {
        type: 'integer',
      },
      comment: {
        type: 'text',
        required: true,
      },
      rating: {
        type: 'integer',
        required: true,
        min: 1,
        max: 5,
      },
      likes: {
        via: 'review',
        collection: 'like',
        isVirtual: true,
        type: 'relation',
        targetModel: 'application::like.like',
        relationType: 'oneToMany',
      },
      author: {
        model: 'user',
        plugin: 'users-permissions',
        type: 'relation',
        targetModel: 'plugins::users-permissions.user',
        relationType: 'oneWay',
      },
      restaurant: {
        model: 'restaurant',
        type: 'relation',
        targetModel: 'application::restaurant.restaurant',
        relationType: 'oneWay',
      },
      created_at: {
        type: 'timestamp',
      },
      updated_at: {
        type: 'timestamp',
      },
    },
  },
  {
    uid: 'strapi::permission',
    isDisplayed: false,
    apiID: 'permission',
    kind: 'collectionType',
    info: {
      name: 'Permission',
      description: '',
      label: 'Permissions',
    },
    options: {
      timestamps: ['created_at', 'updated_at'],
    },
    attributes: {
      id: {
        type: 'integer',
      },
      action: {
        type: 'string',
        minLength: 1,
        configurable: false,
        required: true,
      },
      subject: {
        type: 'string',
        minLength: 1,
        configurable: false,
        required: false,
      },
      fields: {
        type: 'json',
        configurable: false,
        required: false,
        default: [],
      },
      conditions: {
        type: 'json',
        configurable: false,
        required: false,
        default: [],
      },
      role: {
        configurable: false,
        model: 'role',
        plugin: 'admin',
        type: 'relation',
        targetModel: 'strapi::role',
        relationType: 'manyToOne',
      },
      created_at: {
        type: 'timestamp',
      },
      updated_at: {
        type: 'timestamp',
      },
    },
  },
  {
    uid: 'strapi::role',
    isDisplayed: false,
    apiID: 'role',
    kind: 'collectionType',
    info: {
      name: 'Role',
      description: '',
      label: 'Roles',
    },
    options: {
      timestamps: ['created_at', 'updated_at'],
    },
    attributes: {
      id: {
        type: 'integer',
      },
      name: {
        type: 'string',
        minLength: 1,
        unique: true,
        configurable: false,
        required: true,
      },
      code: {
        type: 'string',
        minLength: 1,
        unique: true,
        configurable: false,
        required: true,
      },
      description: {
        type: 'string',
        configurable: false,
      },
      users: {
        configurable: false,
        collection: 'user',
        via: 'roles',
        plugin: 'admin',
        attribute: 'user',
        column: 'id',
        isVirtual: true,
        type: 'relation',
        targetModel: 'strapi::user',
        relationType: 'manyToMany',
      },
      permissions: {
        configurable: false,
        plugin: 'admin',
        collection: 'permission',
        via: 'role',
        isVirtual: true,
        type: 'relation',
        targetModel: 'strapi::permission',
        relationType: 'oneToMany',
      },
      created_at: {
        type: 'timestamp',
      },
      updated_at: {
        type: 'timestamp',
      },
    },
  },
  {
    uid: 'strapi::user',
    isDisplayed: false,
    apiID: 'user',
    kind: 'collectionType',
    info: {
      name: 'User',
      description: '',
      label: 'Users',
    },
    options: {
      timestamps: false,
    },
    attributes: {
      id: {
        type: 'integer',
      },
      firstname: {
        type: 'string',
        unique: false,
        minLength: 1,
        configurable: false,
        required: false,
      },
      lastname: {
        type: 'string',
        unique: false,
        minLength: 1,
        configurable: false,
        required: false,
      },
      username: {
        type: 'string',
        unique: false,
        configurable: false,
        required: false,
      },
      email: {
        type: 'email',
        minLength: 6,
        configurable: false,
        required: true,
        unique: true,
        private: true,
      },
      password: {
        type: 'password',
        minLength: 6,
        configurable: false,
        required: false,
        private: true,
      },
      resetPasswordToken: {
        type: 'string',
        configurable: false,
        private: true,
      },
      registrationToken: {
        type: 'string',
        configurable: false,
        private: true,
      },
      isActive: {
        type: 'boolean',
        default: false,
        configurable: false,
        private: true,
      },
      roles: {
        collection: 'role',
        collectionName: 'strapi_users_roles',
        via: 'users',
        dominant: true,
        plugin: 'admin',
        configurable: false,
        private: true,
        attribute: 'role',
        column: 'id',
        isVirtual: true,
        type: 'relation',
        targetModel: 'strapi::role',
        relationType: 'manyToMany',
      },
      blocked: {
        type: 'boolean',
        default: false,
        configurable: false,
        private: true,
      },
    },
  },
  {
    uid: 'plugins::upload.file',
    isDisplayed: false,
    apiID: 'file',
    kind: 'collectionType',
    info: {
      name: 'file',
      description: '',
      label: 'Files',
    },
    options: {
      timestamps: ['created_at', 'updated_at'],
    },
    attributes: {
      id: {
        type: 'integer',
      },
      name: {
        type: 'string',
        configurable: false,
        required: true,
      },
      alternativeText: {
        type: 'string',
        configurable: false,
      },
      caption: {
        type: 'string',
        configurable: false,
      },
      width: {
        type: 'integer',
        configurable: false,
      },
      height: {
        type: 'integer',
        configurable: false,
      },
      formats: {
        type: 'json',
        configurable: false,
      },
      hash: {
        type: 'string',
        configurable: false,
        required: true,
      },
      ext: {
        type: 'string',
        configurable: false,
      },
      mime: {
        type: 'string',
        configurable: false,
        required: true,
      },
      size: {
        type: 'decimal',
        configurable: false,
        required: true,
      },
      url: {
        type: 'string',
        configurable: false,
        required: true,
      },
      previewUrl: {
        type: 'string',
        configurable: false,
      },
      provider: {
        type: 'string',
        configurable: false,
        required: true,
      },
      provider_metadata: {
        type: 'json',
        configurable: false,
      },
      related: {
        collection: '*',
        filter: 'field',
        configurable: false,
        type: 'relation',
        targetModel: '*',
        relationType: 'manyMorphToMany',
      },
      created_at: {
        type: 'timestamp',
      },
      updated_at: {
        type: 'timestamp',
      },
    },
  },
  {
    uid: 'plugins::users-permissions.permission',
    isDisplayed: false,
    apiID: 'permission',
    kind: 'collectionType',
    info: {
      name: 'permission',
      description: '',
      label: 'Permissions',
    },
    options: {
      timestamps: false,
    },
    attributes: {
      id: {
        type: 'integer',
      },
      type: {
        type: 'string',
        required: true,
        configurable: false,
      },
      controller: {
        type: 'string',
        required: true,
        configurable: false,
      },
      action: {
        type: 'string',
        required: true,
        configurable: false,
      },
      enabled: {
        type: 'boolean',
        required: true,
        configurable: false,
      },
      policy: {
        type: 'string',
        configurable: false,
      },
      role: {
        model: 'role',
        via: 'permissions',
        plugin: 'users-permissions',
        configurable: false,
        type: 'relation',
        targetModel: 'plugins::users-permissions.role',
        relationType: 'manyToOne',
      },
    },
  },
  {
    uid: 'plugins::users-permissions.role',
    isDisplayed: false,
    apiID: 'role',
    kind: 'collectionType',
    info: {
      name: 'role',
      description: '',
      label: 'Roles',
    },
    options: {
      draftAndPublish: false,
      timestamps: false,
    },
    attributes: {
      id: {
        type: 'integer',
      },
      name: {
        type: 'string',
        minLength: 3,
        required: true,
        configurable: false,
      },
      description: {
        type: 'string',
        configurable: false,
      },
      type: {
        type: 'string',
        unique: true,
        configurable: false,
      },
      permissions: {
        collection: 'permission',
        via: 'role',
        plugin: 'users-permissions',
        configurable: false,
        isVirtual: true,
        type: 'relation',
        targetModel: 'plugins::users-permissions.permission',
        relationType: 'oneToMany',
      },
      users: {
        collection: 'user',
        via: 'role',
        plugin: 'users-permissions',
        isVirtual: true,
        type: 'relation',
        targetModel: 'plugins::users-permissions.user',
        relationType: 'oneToMany',
      },
    },
  },
  {
    uid: 'plugins::users-permissions.user',
    isDisplayed: true,
    apiID: 'user',
    kind: 'collectionType',
    info: {
      name: 'user',
      description: '',
      label: 'Users',
    },
    options: {
      draftAndPublish: false,
      timestamps: ['created_at', 'updated_at'],
    },
    attributes: {
      id: {
        type: 'integer',
      },
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
      provider: {
        type: 'string',
        configurable: false,
      },
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
      confirmationToken: {
        type: 'string',
        configurable: false,
        private: true,
      },
      confirmed: {
        type: 'boolean',
        default: false,
        configurable: false,
      },
      blocked: {
        type: 'boolean',
        default: false,
        configurable: false,
      },
      role: {
        model: 'role',
        via: 'users',
        plugin: 'users-permissions',
        configurable: false,
        type: 'relation',
        targetModel: 'plugins::users-permissions.role',
        relationType: 'manyToOne',
      },
      picture: {
        type: 'media',
        multiple: false,
        required: false,
      },
      created_at: {
        type: 'timestamp',
      },
      updated_at: {
        type: 'timestamp',
      },
    },
  },
  {
    uid: 'plugins::myplugin.test',
    isDisplayed: true,
    apiID: 'test',
    kind: 'collectionType',
    info: {
      name: 'test',
      description: '',
      label: 'Tests',
    },
    options: {
      draftAndPublish: false,
      timestamps: false,
    },
    attributes: {
      id: {
        type: 'integer',
      },
      type: {
        type: 'string',
        required: true,
        unique: true,
        configurable: true,
      },
    },
  },
];

const singleTypes = [
  {
    uid: 'application::homepage.homepage',
    isDisplayed: true,
    apiID: 'homepage',
    kind: 'singleType',
    info: {
      name: 'Homepage',
      label: 'Homepage',
    },
    options: {
      draftAndPublish: true,
      increments: true,
      timestamps: ['created_at', 'updated_at'],
    },
    attributes: {
      id: {
        type: 'integer',
      },
      title: {
        type: 'string',
        required: true,
      },
      slug: {
        type: 'uid',
        targetField: 'title',
        required: true,
      },
      single: {
        type: 'media',
        multiple: false,
        required: false,
        allowedTypes: ['images', 'files', 'videos'],
      },
      multiple: {
        type: 'media',
        multiple: true,
        required: false,
        allowedTypes: ['images', 'videos'],
      },
      published_at: {
        type: 'datetime',
        configurable: false,
      },
      created_at: {
        type: 'timestamp',
      },
      updated_at: {
        type: 'timestamp',
      },
    },
  },
];

const contentTypes = [...collectionTypes, ...singleTypes];

export { collectionTypes, contentTypes, singleTypes };
