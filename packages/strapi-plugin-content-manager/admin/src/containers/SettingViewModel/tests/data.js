const data = {
  uid: 'article',
  schema: {
    modelType: 'contentType',
    connection: 'default',
    collectionName: 'articles',
    info: { name: 'article', description: '' },
    options: {
      increments: true,
      timestamps: ['created_at', 'updated_at'],
      comment: '',
    },
    attributes: {
      id: { type: 'integer' },
      title: { type: 'string', required: true, unique: true },
      content: { type: 'richtext', default: 'content' },
      published: { type: 'boolean' },
      json: { type: 'json' },
      number: { type: 'integer' },
      big_number: { type: 'biginteger' },
      float_number: { type: 'float' },
      decimal_number: { type: 'decimal' },
      date: { type: 'date' },
      enum: { type: 'enumeration', enum: ['morning,', 'noon'] },
      bool: { type: 'boolean' },
      pic: { type: 'media', multiple: false, required: false },
      pictures: { type: 'media', multiple: true, required: false },
      mainTag: {
        model: 'tag',
        type: 'relation',
        targetModel: 'tag',
        relationType: 'oneWay',
      },
      linkedTags: {
        collection: 'tag',
        attribute: 'tag',
        column: 'id',
        isVirtual: true,
        type: 'relation',
        targetModel: 'tag',
        relationType: 'manyWay',
      },
      manyTags: {
        collection: 'tag',
        via: 'linkedArticles',
        dominant: true,
        attribute: 'tag',
        column: 'id',
        isVirtual: true,
        type: 'relation',
        targetModel: 'tag',
        relationType: 'manyToMany',
      },
      fb_cta: { type: 'group', group: 'facebook_cta' },
      mainIngredient: { type: 'group', group: 'ingredients' },
      ingredients: {
        type: 'group',
        group: 'ingredients',
        repeatable: true,
        min: 1,
        max: 10,
      },
      created_at: { type: 'timestamp' },
      updated_at: { type: 'timestamp' },
    },
  },
  settings: {
    searchable: true,
    filterable: true,
    bulkable: true,
    pageSize: 10,
    mainField: 'id',
    defaultSortBy: 'id',
    defaultSortOrder: 'ASC',
  },
  metadatas: {
    enum: {
      edit: {
        label: 'Enum',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Enum', searchable: true, sortable: true },
    },
    mainTag: {
      edit: {
        label: 'MainTag',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
        mainField: 'id',
      },
      list: { label: 'MainTag', searchable: false, sortable: false },
    },
    ingredients: {
      edit: {
        label: 'Ingredients',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Ingredients', searchable: false, sortable: false },
    },
    json: {
      edit: {
        label: 'Json',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Json', searchable: false, sortable: false },
    },
    big_number: {
      edit: {
        label: 'Big_number',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Big_number', searchable: true, sortable: true },
    },
    number: {
      edit: {
        label: 'Number',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Number', searchable: true, sortable: true },
    },
    mainIngredient: {
      edit: {
        label: 'MainIngredient',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'MainIngredient', searchable: false, sortable: false },
    },
    created_at: {
      edit: {
        label: 'Created_at',
        description: '',
        placeholder: '',
        visible: false,
        editable: true,
      },
      list: { label: 'Created_at', searchable: true, sortable: true },
    },
    pic: {
      edit: {
        label: 'Pic',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Pic', searchable: true, sortable: true },
    },
    bool: {
      edit: {
        label: 'Bool',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Bool', searchable: true, sortable: true },
    },
    float_number: {
      edit: {
        label: 'Float_number',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Float_number', searchable: true, sortable: true },
    },
    fb_cta: {
      edit: {
        label: 'Fb_cta',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Fb_cta', searchable: false, sortable: false },
    },
    published: {
      edit: {
        label: 'Published',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Published', searchable: true, sortable: true },
    },
    date: {
      edit: {
        label: 'Date',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Date', searchable: true, sortable: true },
    },
    linkedTags: {
      edit: {
        label: 'LinkedTags',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
        mainField: 'id',
      },
      list: { label: 'LinkedTags', searchable: false, sortable: false },
    },
    pictures: {
      edit: {
        label: 'Pictures',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Pictures', searchable: true, sortable: true },
    },
    updated_at: {
      edit: {
        label: 'Updated_at',
        description: '',
        placeholder: '',
        visible: false,
        editable: true,
      },
      list: { label: 'Updated_at', searchable: true, sortable: true },
    },
    decimal_number: {
      edit: {
        label: 'Decimal_number',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Decimal_number', searchable: true, sortable: true },
    },
    title: {
      edit: {
        label: 'Title',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Title', searchable: true, sortable: true },
    },
    manyTags: {
      edit: {
        label: 'ManyTags',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
        mainField: 'id',
      },
      list: { label: 'ManyTags', searchable: false, sortable: false },
    },
    content: {
      edit: {
        label: 'Content',
        description: '',
        placeholder: '',
        visible: true,
        editable: true,
      },
      list: { label: 'Content', searchable: true, sortable: true },
    },
    id: { edit: {}, list: { label: 'Id', searchable: true, sortable: true } },
  },
  layouts: {
    list: ['id', 'title', 'content', 'updated_at', 'published'],
    editRelations: ['mainTag', 'linkedTags', 'manyTags'],
    edit: [
      {
        rowId: 0,
        rowContent: [
          { name: 'pictures', size: 6 },
          { name: '_TEMP_', size: 6 },
        ],
      },
      {
        rowId: 1,
        rowContent: [
          { name: 'big_number', size: 4 },
          { name: 'number', size: 4 },
          { name: 'float_number', size: 4 },
        ],
      },
      {
        rowId: 5,

        rowContent: [{ name: 'ingredients', size: 12 }],
      },
      {
        rowId: 10,
        rowContent: [{ name: 'fb_cta', size: 12 }],
      },
      {
        rowId: 11,
        rowContent: [
          { name: 'published', size: 4 },
          { name: 'date', size: 4 },
          { name: '_TEMP_', size: 4 },
        ],
      },
    ],
  },
};

export default data;
