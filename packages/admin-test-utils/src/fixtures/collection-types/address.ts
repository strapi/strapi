const address = {
  uid: 'api::address.address',
  settings: {
    bulkable: true,
    filterable: true,
    searchable: true,
    pageSize: 10,
    mainField: 'postal_coder',
    defaultSortBy: 'postal_coder',
    defaultSortOrder: 'ASC',
  },
  metadatas: {
    id: { edit: {}, list: { label: 'Id', searchable: true, sortable: true } },
    postal_coder: {
      edit: {
        label: 'Postal_coder',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Postal_coder', searchable: true, sortable: true },
    },
    categories: {
      list: {
        label: 'Categories',
        searchable: false,
        sortable: false,
        mainField: { name: 'name', schema: { type: 'string' } },
      },
      edit: {
        label: 'Categories',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
        mainField: { name: 'name', schema: { type: 'string' } },
      },
    },
    cover: {
      edit: { label: 'Cover', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Cover', searchable: false, sortable: false },
    },
    images: {
      edit: { label: 'Images', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Images', searchable: false, sortable: false },
    },
    city: {
      edit: { label: 'City', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'City', searchable: true, sortable: true },
    },
    likes: {
      list: {
        label: 'Likes',
        searchable: false,
        sortable: false,
        mainField: { name: 'id', schema: { type: 'integer' } },
      },
      edit: {
        label: 'Likes',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
        mainField: { name: 'id', schema: { type: 'integer' } },
      },
    },
    json: {
      edit: { label: 'Json', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Json', searchable: false, sortable: false },
    },
    slug: {
      edit: { label: 'Slug', description: '', placeholder: '', visible: true, editable: true },
      list: { label: 'Slug', searchable: true, sortable: true },
    },
    notrepeat_req: {
      edit: {
        label: 'Notrepeat_req',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Notrepeat_req', searchable: false, sortable: false },
    },
    repeat_req: {
      edit: {
        label: 'Repeat_req',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Repeat_req', searchable: false, sortable: false },
    },
    repeat_req_min: {
      edit: {
        label: 'Repeat_req_min',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Repeat_req_min', searchable: false, sortable: false },
    },
    createdAt: {
      edit: {
        label: 'CreatedAt',
        description: '',
        placeholder: '',
        visible: false,
        editable: true,
      },
      list: { label: 'CreatedAt', searchable: true, sortable: true },
    },
    updatedAt: {
      edit: {
        label: 'UpdatedAt',
        description: '',
        placeholder: '',
        visible: false,
        editable: true,
      },
      list: { label: 'UpdatedAt', searchable: true, sortable: true },
    },
  },
  layouts: {
    list: [
      {
        key: '__id_key__',
        name: 'id',
        fieldSchema: { type: 'integer' },
        metadatas: { label: 'Id', searchable: true, sortable: true },
      },
      {
        key: '__postal_coder_key__',
        name: 'postal_coder',
        fieldSchema: { type: 'string', pluginOptions: { i18n: { localized: true } } },
        metadatas: { label: 'Postal_coder', searchable: true, sortable: true },
      },
      {
        key: '__categories_key__',
        name: 'categories',
        fieldSchema: {
          collection: 'category',
          via: 'addresses',
          dominant: true,
          attribute: 'category',
          column: 'id',
          isVirtual: true,
          type: 'relation',
          targetModel: 'api::category.category',
          relationType: 'manyToMany',
        },
        metadatas: {
          label: 'Categories',
          searchable: false,
          sortable: false,
          mainField: { name: 'name', schema: { type: 'string' } },
        },
        queryInfos: {
          endPoint: 'collection-types/api::address.address',
          defaultParams: {},
        },
      },
      {
        key: '__cover_key__',
        name: 'cover',
        fieldSchema: {
          type: 'media',
          multiple: false,
          required: false,
          allowedTypes: ['files', 'images', 'videos'],
          pluginOptions: { i18n: { localized: true } },
        },
        metadatas: { label: 'Cover', searchable: false, sortable: false },
      },
    ],
    edit: [
      [
        {
          name: 'postal_coder',
          size: 6,
          fieldSchema: { type: 'string', pluginOptions: { i18n: { localized: true } } },
          metadatas: {
            label: 'Postal_coder',
            description: '',
            placeholder: '',
            visible: true,
            editable: true,
          },
        },
        {
          name: 'cover',
          size: 6,
          fieldSchema: {
            type: 'media',
            multiple: false,
            required: false,
            allowedTypes: ['files', 'images', 'videos'],
            pluginOptions: { i18n: { localized: true } },
          },
          metadatas: {
            label: 'Cover',
            description: '',
            placeholder: '',
            visible: true,
            editable: true,
          },
        },
      ],
      [
        {
          name: 'images',
          size: 6,
          fieldSchema: {
            type: 'media',
            multiple: true,
            required: false,
            allowedTypes: ['images'],
            pluginOptions: { i18n: { localized: true } },
          },
          metadatas: {
            label: 'Images',
            description: '',
            placeholder: '',
            visible: true,
            editable: true,
          },
        },
        {
          name: 'city',
          size: 6,
          fieldSchema: {
            type: 'string',
            required: true,
            maxLength: 200,
            pluginOptions: { i18n: { localized: true } },
          },
          metadatas: {
            label: 'City',
            description: '',
            placeholder: '',
            visible: true,
            editable: true,
          },
        },
      ],
      [
        {
          name: 'json',
          size: 12,
          fieldSchema: { type: 'json', pluginOptions: { i18n: { localized: true } } },
          metadatas: {
            label: 'Json',
            description: '',
            placeholder: '',
            visible: true,
            editable: true,
          },
        },
      ],
      [
        {
          name: 'slug',
          size: 6,
          fieldSchema: { type: 'uid', targetField: 'city' },
          metadatas: {
            label: 'Slug',
            description: '',
            placeholder: '',
            visible: true,
            editable: true,
          },
        },
      ],
      [
        {
          name: 'notrepeat_req',
          size: 12,
          fieldSchema: {
            type: 'component',
            repeatable: false,
            pluginOptions: { i18n: { localized: false } },
            component: 'blog.test-como',
            required: true,
          },
          metadatas: {
            label: 'Notrepeat_req',
            description: '',
            placeholder: '',
            visible: true,
            editable: true,
          },
        },
      ],
      [
        {
          name: 'repeat_req',
          size: 12,
          fieldSchema: {
            type: 'component',
            repeatable: true,
            pluginOptions: { i18n: { localized: true } },
            component: 'blog.test-como',
            required: true,
          },
          metadatas: {
            label: 'Repeat_req',
            description: '',
            placeholder: '',
            visible: true,
            editable: true,
          },
        },
      ],
      [
        {
          name: 'repeat_req_min',
          size: 12,
          fieldSchema: {
            type: 'component',
            repeatable: true,
            pluginOptions: { i18n: { localized: true } },
            component: 'blog.test-como',
            required: false,
            min: 2,
          },
          metadatas: {
            label: 'Repeat_req_min',
            description: '',
            placeholder: '',
            visible: true,
            editable: true,
          },
        },
      ],
    ],
  },
  isDisplayed: true,
  apiID: 'address',
  kind: 'collectionType',
  info: { displayName: 'addresse', name: 'address', description: '', label: 'Addresses' },
  options: {
    increments: true,
    timestamps: ['createdAt', 'updatedAt'],
    comment: '',
  },
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    id: { type: 'integer' },
    postal_coder: { type: 'string', pluginOptions: { i18n: { localized: true } } },
    categories: {
      collection: 'category',
      via: 'addresses',
      dominant: true,
      attribute: 'category',
      column: 'id',
      isVirtual: true,
      type: 'relation',
      targetModel: 'api::category.category',
      relationType: 'manyToMany',
    },
    cover: {
      type: 'media',
      multiple: false,
      required: false,
      allowedTypes: ['files', 'images', 'videos'],
      pluginOptions: { i18n: { localized: true } },
    },
    images: {
      type: 'media',
      multiple: true,
      required: false,
      allowedTypes: ['images'],
      pluginOptions: { i18n: { localized: true } },
    },
    city: {
      type: 'string',
      required: true,
      maxLength: 200,
      pluginOptions: { i18n: { localized: true } },
    },
    likes: {
      collection: 'like',
      via: 'address',
      isVirtual: true,
      type: 'relation',
      targetModel: 'api::like.like',
      relationType: 'oneToMany',
    },
    json: { type: 'json', pluginOptions: { i18n: { localized: true } } },
    slug: { type: 'uid', targetField: 'city' },
    notrepeat_req: {
      type: 'component',
      repeatable: false,
      pluginOptions: { i18n: { localized: false } },
      component: 'blog.test-como',
      required: true,
    },
    repeat_req: {
      type: 'component',
      repeatable: true,
      pluginOptions: { i18n: { localized: true } },
      component: 'blog.test-como',
      required: true,
    },
    repeat_req_min: {
      type: 'component',
      repeatable: true,
      pluginOptions: { i18n: { localized: true } },
      component: 'blog.test-como',
      required: false,
      min: 2,
    },
    createdAt: { type: 'timestamp' },
    updatedAt: { type: 'timestamp' },
  },
};

type Address = typeof address;

export { address, Address };
