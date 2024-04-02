/* -------------------------------------------------------------------------------------------------
 * CM_COMPONENTS_MOCK_DATA
 * -----------------------------------------------------------------------------------------------*/

const CM_COMPONENTS_MOCK_DATA = [
  {
    uid: 'blog.test-como',
    isDisplayed: true,
    apiID: 'test-como',
    category: 'blog',
    info: {
      displayName: 'test comp',
      icon: 'air-freshener',
      description: '',
    },
    options: {},
    attributes: {
      id: {
        type: 'string',
      },
      name: {
        type: 'string',
        default: 'toto',
      },
    },
  },
];

/* -------------------------------------------------------------------------------------------------
 * CM_CONTENT_TYPE_MOCK_DATA
 * -----------------------------------------------------------------------------------------------*/

const CM_CONTENT_TYPE_MOCK_DATA = [
  {
    uid: 'admin::permission',
    isDisplayed: false,
    apiID: 'permission',
    kind: 'collectionType',
    info: {
      name: 'Permission',
      description: '',
      singularName: 'permission',
      pluralName: 'permissions',
      displayName: 'Permission',
    },
    options: {},
    pluginOptions: {
      'content-manager': {
        visible: false,
      },
      'content-type-builder': {
        visible: false,
      },
    },
    attributes: {
      id: {
        type: 'string',
      },
      action: {
        type: 'string',
        minLength: 1,
        configurable: false,
        required: true,
      },
      actionParameters: {
        type: 'json',
        configurable: false,
        required: false,
        default: {},
      },
      subject: {
        type: 'string',
        minLength: 1,
        configurable: false,
        required: false,
      },
      properties: {
        type: 'json',
        configurable: false,
        required: false,
        default: {},
      },
      conditions: {
        type: 'json',
        configurable: false,
        required: false,
        default: [],
      },
      role: {
        configurable: false,
        type: 'relation',
        relation: 'manyToOne',
        inversedBy: 'permissions',
        target: 'admin::role',
        targetModel: 'admin::role',
        relationType: 'manyToOne',
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      createdBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        configurable: false,
        writable: false,
        visible: false,
        useJoinTable: false,
        private: true,
        targetModel: 'admin::user',
        relationType: 'oneToOne',
      },
      updatedBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        configurable: false,
        writable: false,
        visible: false,
        useJoinTable: false,
        private: true,
        targetModel: 'admin::user',
        relationType: 'oneToOne',
      },
    },
  },
  {
    uid: 'admin::user',
    isDisplayed: false,
    apiID: 'user',
    kind: 'collectionType',
    info: {
      name: 'User',
      description: '',
      singularName: 'user',
      pluralName: 'users',
      displayName: 'User',
    },
    pluginOptions: {
      'content-manager': {
        visible: false,
      },
      'content-type-builder': {
        visible: false,
      },
    },
    attributes: {
      id: {
        type: 'string',
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
        searchable: false,
      },
      resetPasswordToken: {
        type: 'string',
        configurable: false,
        private: true,
        searchable: false,
      },
      registrationToken: {
        type: 'string',
        configurable: false,
        private: true,
        searchable: false,
      },
      isActive: {
        type: 'boolean',
        default: false,
        configurable: false,
        private: true,
      },
      roles: {
        configurable: false,
        private: true,
        type: 'relation',
        relation: 'manyToMany',
        inversedBy: 'users',
        target: 'admin::role',
        collectionName: 'strapi_users_roles',
        targetModel: 'admin::role',
        relationType: 'manyToMany',
      },
      blocked: {
        type: 'boolean',
        default: false,
        configurable: false,
        private: true,
      },
      preferedLanguage: {
        type: 'string',
        configurable: false,
        required: false,
        searchable: false,
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      createdBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        configurable: false,
        writable: false,
        visible: false,
        useJoinTable: false,
        private: true,
        targetModel: 'admin::user',
        relationType: 'oneToOne',
      },
      updatedBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        configurable: false,
        writable: false,
        visible: false,
        useJoinTable: false,
        private: true,
        targetModel: 'admin::user',
        relationType: 'oneToOne',
      },
    },
  },
  {
    uid: 'admin::role',
    isDisplayed: false,
    apiID: 'role',
    kind: 'collectionType',
    info: {
      name: 'Role',
      description: '',
      singularName: 'role',
      pluralName: 'roles',
      displayName: 'Role',
    },
    options: {},
    pluginOptions: {
      'content-manager': {
        visible: false,
      },
      'content-type-builder': {
        visible: false,
      },
    },
    attributes: {
      id: {
        type: 'string',
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
        type: 'relation',
        relation: 'manyToMany',
        mappedBy: 'roles',
        target: 'admin::user',
        targetModel: 'admin::user',
        relationType: 'manyToMany',
      },
      permissions: {
        configurable: false,
        type: 'relation',
        relation: 'oneToMany',
        mappedBy: 'role',
        target: 'admin::permission',
        targetModel: 'admin::permission',
        relationType: 'oneToMany',
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      createdBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        configurable: false,
        writable: false,
        visible: false,
        useJoinTable: false,
        private: true,
        targetModel: 'admin::user',
        relationType: 'oneToOne',
      },
      updatedBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        configurable: false,
        writable: false,
        visible: false,
        useJoinTable: false,
        private: true,
        targetModel: 'admin::user',
        relationType: 'oneToOne',
      },
    },
  },
  {
    uid: 'api::address.address',
    isDisplayed: true,
    apiID: 'address',
    kind: 'collectionType',
    info: {
      displayName: 'Address',
      singularName: 'address',
      pluralName: 'addresses',
      description: '',
      name: 'Address',
    },
    options: {},
    pluginOptions: {},
    attributes: {
      id: {
        type: 'string',
      },
      postal_code: {
        type: 'string',
        pluginOptions: {},
        maxLength: 2,
      },
      categories: {
        type: 'relation',
        relation: 'manyToMany',
        target: 'api::category.category',
        inversedBy: 'addresses',
        targetModel: 'api::category.category',
        relationType: 'manyToMany',
      },
      cover: {
        type: 'media',
        multiple: false,
        required: false,
        allowedTypes: ['files', 'images', 'videos', 'audios'],
        pluginOptions: {},
      },
      images: {
        type: 'media',
        multiple: true,
        required: false,
        allowedTypes: ['images'],
        pluginOptions: {},
      },
      city: {
        type: 'string',
        required: true,
        maxLength: 200,
        pluginOptions: {},
      },
      json: {
        type: 'json',
        pluginOptions: {},
      },
      slug: {
        type: 'uid',
      },
      notrepeat_req: {
        type: 'component',
        repeatable: false,
        pluginOptions: {},
        component: 'blog.test-como',
        required: true,
      },
      repeat_req: {
        type: 'component',
        repeatable: true,
        pluginOptions: {},
        component: 'blog.test-como',
        required: true,
      },
      repeat_req_min: {
        type: 'component',
        repeatable: true,
        pluginOptions: {},
        component: 'blog.test-como',
        required: false,
        min: 2,
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      createdBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        configurable: false,
        writable: false,
        visible: false,
        useJoinTable: false,
        private: true,
        targetModel: 'admin::user',
        relationType: 'oneToOne',
      },
      updatedBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        configurable: false,
        writable: false,
        visible: false,
        useJoinTable: false,
        private: true,
        targetModel: 'admin::user',
        relationType: 'oneToOne',
      },
    },
  },
  {
    uid: 'api::article.article',
    isDisplayed: true,
    apiID: 'article',
    kind: 'collectionType',
    info: {
      singularName: 'article',
      pluralName: 'articles',
      displayName: 'Article',
      description: '',
    },
    options: { draftAndPublish: true },
    attributes: {
      id: {
        type: 'string',
      },
      Title: {
        type: 'string',
        default: 'New article',
      },
      content: {
        type: 'blocks',
        required: true,
      },
      date_of_writing: {
        type: 'date',
        required: true,
        unique: true,
      },
      createdAt: {
        type: 'datetime',
      },
      updatedAt: {
        type: 'datetime',
      },
      createdBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        configurable: false,
        writable: false,
        visible: false,
        useJoinTable: false,
        private: true,
        targetModel: 'admin::user',
        relationType: 'oneToOne',
      },
      updatedBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        configurable: false,
        writable: false,
        visible: false,
        useJoinTable: false,
        private: true,
        targetModel: 'admin::user',
        relationType: 'oneToOne',
      },
    },
  },
];

/* -------------------------------------------------------------------------------------------------
 * CM_CONFIGURATION_MOCK_DATA
 * -----------------------------------------------------------------------------------------------*/

const CM_SINGLE_TYPE_LAYOUT_MOCK_DATA = {
  contentType: {
    uid: 'api::homepage.homepage',
    settings: {
      bulkable: true,
      filterable: true,
      searchable: true,
      pageSize: 10,
      mainField: 'title',
      defaultSortBy: 'title',
      defaultSortOrder: 'ASC',
    },
    metadatas: {
      id: {
        edit: {},
        list: {
          label: 'id',
          searchable: true,
          sortable: true,
        },
      },
      title: {
        edit: {
          label: 'title',
          description: '',
          placeholder: '',
          visible: true,
          editable: true,
        },
        list: {
          label: 'title',
          searchable: true,
          sortable: true,
        },
      },
      slug: {
        edit: {
          label: 'slug',
          description: '',
          placeholder: '',
          visible: true,
          editable: true,
        },
        list: {
          label: 'slug',
          searchable: true,
          sortable: true,
        },
      },
      single: {
        edit: {
          label: 'single',
          description: '',
          placeholder: '',
          visible: true,
          editable: true,
        },
        list: {
          label: 'single',
          searchable: false,
          sortable: false,
        },
      },
      multiple: {
        edit: {
          label: 'multiple',
          description: '',
          placeholder: '',
          visible: true,
          editable: true,
        },
        list: {
          label: 'multiple',
          searchable: false,
          sortable: false,
        },
      },
      createdAt: {
        edit: {
          label: 'createdAt',
          description: '',
          placeholder: '',
          visible: false,
          editable: true,
        },
        list: {
          label: 'createdAt',
          searchable: true,
          sortable: true,
        },
      },
      updatedAt: {
        edit: {
          label: 'updatedAt',
          description: '',
          placeholder: '',
          visible: false,
          editable: true,
        },
        list: {
          label: 'updatedAt',
          searchable: true,
          sortable: true,
        },
      },
    },
    layouts: {
      list: ['id', 'title', 'slug', 'single'],
      edit: [
        [
          {
            name: 'title',
            size: 6,
          },
          {
            name: 'slug',
            size: 6,
          },
        ],
        [
          {
            name: 'single',
            size: 6,
          },
          {
            name: 'multiple',
            size: 6,
          },
        ],
      ],
    },
  },
  components: {},
};

const CM_COLLECTION_TYPE_LAYOUT_MOCK_DATA = {
  contentType: {
    uid: 'api::address.address',
    settings: {
      bulkable: true,
      filterable: true,
      searchable: true,
      pageSize: 10,
      mainField: 'id',
      defaultSortBy: 'id',
      defaultSortOrder: 'ASC',
    },
    metadatas: {
      id: {
        edit: {},
        list: {
          label: 'id',
          searchable: true,
          sortable: true,
        },
      },
      postal_code: {
        edit: {
          label: 'postal_code',
          description: '',
          placeholder: '',
          visible: true,
          editable: true,
        },
        list: {
          label: 'postal_code',
          searchable: true,
          sortable: true,
        },
      },
      categories: {
        edit: {
          label: 'categories',
          description: '',
          placeholder: '',
          visible: true,
          editable: true,
          mainField: 'name',
        },
        list: {
          label: 'categories',
          searchable: false,
          sortable: false,
          mainField: 'name',
        },
      },
      cover: {
        edit: {
          label: 'cover',
          description: '',
          placeholder: '',
          visible: true,
          editable: true,
        },
        list: {
          label: 'cover',
          searchable: false,
          sortable: false,
        },
      },
      images: {
        edit: {
          label: 'images',
          description: '',
          placeholder: '',
          visible: true,
          editable: true,
        },
        list: {
          label: 'images',
          searchable: false,
          sortable: false,
        },
      },
      city: {
        edit: {
          label: 'city',
          description: '',
          placeholder: '',
          visible: true,
          editable: true,
        },
        list: {
          label: 'city',
          searchable: true,
          sortable: true,
        },
      },
      json: {
        edit: {
          label: 'json',
          description: '',
          placeholder: '',
          visible: true,
          editable: true,
        },
        list: {
          label: 'json',
          searchable: false,
          sortable: false,
        },
      },
      slug: {
        edit: {
          label: 'slug',
          description: '',
          placeholder: '',
          visible: true,
          editable: true,
        },
        list: {
          label: 'slug',
          searchable: true,
          sortable: true,
        },
      },
      notrepeat_req: {
        edit: {
          label: 'notrepeat_req',
          description: '',
          placeholder: '',
          visible: true,
          editable: true,
        },
        list: {
          label: 'notrepeat_req',
          searchable: false,
          sortable: false,
        },
      },
      repeat_req: {
        edit: {
          label: 'repeat_req',
          description: '',
          placeholder: '',
          visible: true,
          editable: true,
        },
        list: {
          label: 'repeat_req',
          searchable: false,
          sortable: false,
        },
      },
      repeat_req_min: {
        edit: {
          label: 'repeat_req_min',
          description: '',
          placeholder: '',
          visible: true,
          editable: true,
        },
        list: {
          label: 'repeat_req_min',
          searchable: false,
          sortable: false,
        },
      },
      createdAt: {
        edit: {
          label: 'createdAt',
          description: '',
          placeholder: '',
          visible: false,
          editable: true,
        },
        list: {
          label: 'createdAt',
          searchable: true,
          sortable: true,
        },
      },
      updatedAt: {
        edit: {
          label: 'updatedAt',
          description: '',
          placeholder: '',
          visible: false,
          editable: true,
        },
        list: {
          label: 'updatedAt',
          searchable: true,
          sortable: true,
        },
      },
      createdBy: {
        edit: {
          label: 'createdBy',
          description: '',
          placeholder: '',
          visible: false,
          editable: true,
          mainField: 'firstname',
        },
        list: {
          label: 'createdBy',
          searchable: true,
          sortable: true,
          mainField: 'firstname',
        },
      },
      updatedBy: {
        edit: {
          label: 'updatedBy',
          description: '',
          placeholder: '',
          visible: false,
          editable: true,
          mainField: 'firstname',
        },
        list: {
          label: 'updatedBy',
          searchable: true,
          sortable: true,
          mainField: 'firstname',
        },
      },
    },
    layouts: {
      list: ['id', 'categories', 'cover', 'postal_code'],
      edit: [
        [
          {
            name: 'slug',
            size: 6,
          },
        ],
        [
          {
            name: 'notrepeat_req',
            size: 12,
          },
        ],
        [
          {
            name: 'repeat_req',
            size: 12,
          },
        ],
        [
          {
            name: 'repeat_req_min',
            size: 12,
          },
        ],
        [
          {
            name: 'categories',
            size: 6,
          },
        ],
        [
          {
            name: 'cover',
            size: 6,
          },
          {
            name: 'images',
            size: 6,
          },
        ],
        [
          {
            name: 'city',
            size: 6,
          },
        ],
        [
          {
            name: 'json',
            size: 12,
          },
        ],
      ],
    },
  },
  components: {
    'blog.test-como': {
      uid: 'blog.test-como',
      category: 'blog',
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 10,
        mainField: 'name',
        defaultSortBy: 'name',
        defaultSortOrder: 'ASC',
      },
      metadatas: {
        id: {
          edit: {},
          list: {
            label: 'id',
            searchable: false,
            sortable: false,
          },
        },
        name: {
          edit: {
            label: 'name',
            description: '',
            placeholder: '',
            visible: true,
            editable: true,
          },
          list: {
            label: 'name',
            searchable: true,
            sortable: true,
          },
        },
      },
      layouts: {
        list: ['id', 'name'],
        edit: [
          [
            {
              name: 'name',
              size: 6,
            },
          ],
        ],
      },
      isComponent: true,
    },
  },
};

/* -------------------------------------------------------------------------------------------------
 * MOCK_DATA_EXPORTS
 * -----------------------------------------------------------------------------------------------*/

const mockData = {
  contentManager: {
    contentType: 'api::address.address',
    contentTypes: CM_CONTENT_TYPE_MOCK_DATA,
    components: CM_COMPONENTS_MOCK_DATA,
    singleTypeConfiguration: CM_SINGLE_TYPE_LAYOUT_MOCK_DATA,
    collectionTypeConfiguration: CM_COLLECTION_TYPE_LAYOUT_MOCK_DATA,
  },
} as const;

type MockData = typeof mockData;

export { mockData };
export type { MockData };
