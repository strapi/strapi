import { findAllAndReplace } from '../findAllAndReplace';

describe('findAllAndReplace', () => {
  describe('supplying initial data', () => {
    it('should replace the first level of relations', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        'replaced'
      )(initialValues, schema);

      expect(data.categories).toEqual('replaced');
    });

    it('should replace relations in single components', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        'replaced'
      )(initialValues, schema);

      expect(data.comp_relation.categories).toEqual('replaced');
    });

    it('should replace all relation instances in a repeatable component', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        'replaced'
      )(initialValues, schema);

      data.repeatable_relations.forEach((datum) => expect(datum.categories).toEqual('replaced'));
    });

    it('should replace all relation instances in nested repeatable components', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        'replaced'
      )(initialValues, schema);

      data.repeatable_repeatable_relations.forEach((item) => {
        expect(item.categories).toEqual('hello');

        item.repeatable_relations.forEach((itum) => expect(itum.categories).toEqual('replaced'));
      });
    });

    it('should replace relation instances in dynamic zones correctly', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        'replaced'
      )(initialValues, schema);

      expect(data.dynamic_relations[0].categories).toEqual('replaced');
      expect(data.dynamic_relations[1].categories).toEqual('hello');
    });
  });

  describe('no data', () => {
    it('should replace the first level of relations', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        'replaced'
      )({}, schema);

      expect(data).toMatchInlineSnapshot(`
        {
          "categories": "replaced",
        }
      `);
    });

    it('should not replace relations in single components', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        'replaced'
      )({}, schema);

      expect(data).toMatchInlineSnapshot(`
        {
          "categories": "replaced",
        }
      `);
    });

    it('should not replace relation instances in a repeatable component', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        'replaced'
      )({}, schema);

      expect(data).toMatchInlineSnapshot(`
        {
          "categories": "replaced",
        }
      `);
    });

    it('should not replace all relation instances in nested repeatable components', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        'replaced'
      )({}, schema);

      expect(data).toMatchInlineSnapshot(`
        {
          "categories": "replaced",
        }
      `);
    });

    it('should not replace relation instances in dynamic zones correctly', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        'replaced'
      )({}, schema);

      expect(data).toMatchInlineSnapshot(`
        {
          "categories": "replaced",
        }
      `);
    });
  });

  describe('null values', () => {
    const nullishData = {
      categories: null,
      repeatable_repeatable_relations: null,
      repeatable_relations: null,
      dynamic_relations: null,
      comp_relation: null,
    };

    it('should replace the first level of relations', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        'replaced'
      )(nullishData, schema);

      expect(data).toMatchInlineSnapshot(`
        {
          "categories": "replaced",
          "comp_relation": null,
          "dynamic_relations": null,
          "repeatable_relations": null,
          "repeatable_repeatable_relations": null,
        }
      `);
    });

    it('should not replace relations in single components', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        'replaced'
      )(nullishData, schema);

      expect(data).toMatchInlineSnapshot(`
        {
          "categories": "replaced",
          "comp_relation": null,
          "dynamic_relations": null,
          "repeatable_relations": null,
          "repeatable_repeatable_relations": null,
        }
      `);
    });

    it('should not replace relation instances in a repeatable component', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        'replaced'
      )(nullishData, schema);

      expect(data).toMatchInlineSnapshot(`
        {
          "categories": "replaced",
          "comp_relation": null,
          "dynamic_relations": null,
          "repeatable_relations": null,
          "repeatable_repeatable_relations": null,
        }
      `);
    });

    it('should not replace all relation instances in nested repeatable components', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        'replaced'
      )(nullishData, schema);

      expect(data).toMatchInlineSnapshot(`
        {
          "categories": "replaced",
          "comp_relation": null,
          "dynamic_relations": null,
          "repeatable_relations": null,
          "repeatable_repeatable_relations": null,
        }
      `);
    });

    it('should not replace relation instances in dynamic zones correctly', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        'replaced'
      )(nullishData, schema);

      expect(data).toMatchInlineSnapshot(`
        {
          "categories": "replaced",
          "comp_relation": null,
          "dynamic_relations": null,
          "repeatable_relations": null,
          "repeatable_repeatable_relations": null,
        }
      `);
    });
  });

  describe('replacement as a function', () => {
    it('should pass the data object (not the schema) and use the returned value', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        (datum) => datum.count
      )(initialValues, schema);

      expect(data.categories).toEqual(1);
    });

    it('should provide the path to the data value', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        (_, { path }) => path.join('.')
      )(initialValues, schema);

      expect(data.categories).toEqual('categories');
      expect(data.comp_relation.categories).toEqual('comp_relation.categories');
      expect(data.repeatable_relations[0].categories).toEqual('repeatable_relations.0.categories');
      expect(data.repeatable_repeatable_relations[0].categories).toEqual('hello');
      expect(data.repeatable_repeatable_relations[0].repeatable_relations[0].categories).toEqual(
        'repeatable_repeatable_relations.0.repeatable_relations.0.categories'
      );
    });

    it('should pass the parent of the data value', () => {
      const data = findAllAndReplace(
        components,
        (value) => value.type === 'relation',
        (_, { parent }) => parent
      )(initialValues, schema);

      expect(data.categories).toEqual(data);
      expect(data.comp_relation.categories).toMatchInlineSnapshot(`
        {
          "categories": [Circular],
          "id": 27,
        }
      `);
      expect(data.repeatable_relations[0].categories).toMatchInlineSnapshot(`
        {
          "__temp_key__": 0,
          "categories": [Circular],
          "id": 25,
        }
      `);
      expect(data.repeatable_repeatable_relations[0].categories).toEqual('hello');
      expect(data.repeatable_repeatable_relations[0].repeatable_relations[0].categories)
        .toMatchInlineSnapshot(`
        {
          "__temp_key__": 0,
          "categories": [Circular],
          "id": 31,
        }
      `);
    });
  });
});

const components = {
  'basic.relation': {
    uid: 'basic.relation',
    category: 'basic',
    attributes: {
      id: {
        type: 'integer',
      },
      categories: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::category.category',
        targetModel: 'api::category.category',
        relationType: 'oneToMany',
      },
    },
  },
  'basic.simple': {
    uid: 'basic.simple',
    category: 'basic',
    attributes: {
      id: {
        type: 'integer',
      },
      categories: {
        type: 'string',
        required: true,
      },
    },
  },
  'basic.repeatable-relation': {
    uid: 'basic.repeatable-relation',
    category: 'basic',
    attributes: {
      id: {
        type: 'integer',
      },
      repeatable_relations: {
        type: 'component',
        repeatable: true,
        component: 'basic.relation',
      },
      categories: {
        type: 'string',
      },
    },
  },
};

const schema = {
  id: {
    type: 'integer',
  },
  categories: {
    type: 'relation',
    relation: 'manyToMany',
    target: 'api::category.category',
    inversedBy: 'relation_locales',
    targetModel: 'api::category.category',
    relationType: 'manyToMany',
  },
  title: {
    type: 'string',
    pluginOptions: {
      i18n: {
        localized: true,
      },
    },
  },
  repeatable_relations: {
    type: 'component',
    repeatable: true,
    pluginOptions: {
      i18n: {
        localized: true,
      },
    },
    component: 'basic.relation',
  },
  dynamic_relations: {
    pluginOptions: {
      i18n: {
        localized: true,
      },
    },
    type: 'dynamiczone',
    components: ['basic.relation', 'basic.simple'],
  },
  comp_relation: {
    type: 'component',
    repeatable: false,
    pluginOptions: {
      i18n: {
        localized: true,
      },
    },
    component: 'basic.relation',
  },
  repeatable_repeatable_relations: {
    type: 'component',
    repeatable: true,
    pluginOptions: {
      i18n: {
        localized: true,
      },
    },
    component: 'basic.repeatable-relation',
  },
  createdAt: {
    type: 'datetime',
  },
  updatedAt: {
    type: 'datetime',
  },
};

const initialValues = {
  id: 5,
  title: 'testing',
  createdAt: '2023-03-13T11:48:45.985Z',
  updatedAt: '2023-03-13T11:48:45.985Z',
  publishedAt: null,
  locale: 'en',
  categories: {
    count: 1,
  },
  repeatable_repeatable_relations: [
    {
      id: 1,
      categories: 'hello',
      repeatable_relations: [
        {
          id: 31,
          categories: {
            count: 1,
          },
          __temp_key__: 0,
        },
      ],
      __temp_key__: 0,
    },
    {
      id: 2,
      categories: 'hello',
      repeatable_relations: [
        {
          id: 32,
          categories: {
            count: 1,
          },
          __temp_key__: 0,
        },
      ],
      __temp_key__: 1,
    },
  ],
  repeatable_relations: [
    {
      id: 25,
      categories: {
        count: 1,
      },
      __temp_key__: 0,
    },
    {
      id: 25,
      categories: {
        count: 1,
      },
      __temp_key__: 0,
    },
  ],
  dynamic_relations: [
    {
      __component: 'basic.relation',
      id: 26,
      categories: {
        count: 1,
      },
    },
    {
      __component: 'basic.simple',
      id: 85,
      categories: 'hello',
    },
  ],
  comp_relation: {
    id: 27,
    categories: {
      count: 1,
    },
  },
  createdBy: {
    id: 1,
    firstname: 'J',
    lastname: 'E',
    username: 'jumbojosh',
  },
  updatedBy: {
    id: 1,
    firstname: 'J',
    lastname: 'E',
    username: 'jumbojosh',
  },
  localizations: [],
};
