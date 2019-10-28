const ctLayout = {
  schema: {
    attributes: {
      bool: { type: 'boolean' },
      content: { type: 'richtext' },
      created_at: { type: 'timestamp' },
      date: { type: 'date' },
      enum: { type: 'enumeration', enum: ['un', 'deux'] },
      fb_cta: {
        required: true,
        type: 'component',
        component: 'cta_facebook',
        repeatable: false,
      },
      id: { type: 'integer' },
      ingredients: {
        type: 'component',
        component: 'ingredients',
        repeatable: true,
        min: 1,
        max: 10,
      },
      json: { type: 'json' },
      linkedTags: {
        attribute: 'tag',
        collection: 'tag',
        column: 'id',
        isVirtual: true,
        relationType: 'manyWay',
        targetModel: 'tag',
        type: 'relation',
      },
      mainIngredient: {
        type: 'component',
        component: 'ingredients',
        repeatable: false,
      },
      mainTag: {
        model: 'tag',
        type: 'relation',
        targetModel: 'tag',
        relationType: 'oneWay',
      },
      manyTags: {
        attribute: 'tag',
        collection: 'tag',
        column: 'id',
        dominant: true,
        isVirtual: true,
        relationType: 'manyToMany',
        targetModel: 'tag',
        type: 'relation',
        via: 'linkedArticles',
      },
      number: { type: 'integer' },
      pic: { type: 'media', multiple: false, required: false },
      pictures: { type: 'media', multiple: true, required: false },
      published: { type: 'boolean' },
      title: {
        type: 'string',
        default: 'test',
        required: true,
        unique: true,
      },
      updated_at: { type: 'timestampUpdate' },
    },
  },
};

const componentLayouts = {
  cta_facebook: {
    schema: {
      attributes: {
        description: { type: 'text' },
        id: { type: 'integer' },
        title: { type: 'string' },
      },
    },
  },
  ingredients: {
    schema: {
      attributes: {
        testMultiple: { type: 'media', multiple: true },
        test: { type: 'media', multiple: false },
        id: { type: 'integer' },
        name: { type: 'string' },
      },
    },
  },
};

const simpleCtLayout = {
  uid: 'simple',
  schema: {
    attributes: {
      title: {
        type: 'string',
        default: 'test',
      },
      article: {
        type: 'relation',
        relationType: 'oneToOne',
        targetModel: 'article',
      },
      articles: {
        type: 'relation',
        relationType: 'manyToMany',
        targetModel: 'article',
      },
      picture: {
        type: 'media',
        multiple: false,
      },
      pictures: {
        type: 'media',
        multiple: true,
      },
    },
  },
  // We don't need this key for the test
  layouts: {},
  // We don't need this key for the test
  settings: {},
};

export { ctLayout, componentLayouts, simpleCtLayout };
