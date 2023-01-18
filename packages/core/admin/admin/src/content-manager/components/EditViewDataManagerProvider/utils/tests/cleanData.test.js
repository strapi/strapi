import cleanData from '../cleanData';

describe('CM || components || EditViewDataManagerProvider || utils || cleanData', () => {
  describe('single values', () => {
    test('should parse json value', () => {
      const result = cleanData(
        {
          browserState: { jsonTest: '{\n  "cat": "michka"\n}' },
          serverState: {},
        },
        {
          attributes: {
            jsonTest: {
              type: 'json',
            },
          },
        },
        {}
      );

      const expected = {
        jsonTest: { cat: 'michka' },
      };

      expect(result).toEqual(expected);
    });

    test('should parse time value', () => {
      const result = cleanData(
        {
          browserState: {
            timeTest: '11:38',
          },
          serverState: {},
        },
        {
          attributes: {
            timeTest: {
              type: 'time',
            },
          },
        },
        {}
      );

      const expected = {
        timeTest: '11:38:00',
      };

      expect(result).toEqual(expected);
    });

    test('should parse media value by multiple type', () => {
      const result = cleanData(
        {
          browserState: {
            singleMediaTest: {
              id: 60,
              name: 'cat.png',
              url: '/uploads/cat.png',
            },
            multipleMediaTest: [
              {
                id: 52,
                name: 'cat.png',
                url: '/uploads/cat.png',
              },
              {
                id: 58,
                name: 'cat.png',
                url: '/uploads/cat.png',
              },
            ],
          },
          serverState: {},
        },
        {
          attributes: {
            singleMediaTest: {
              type: 'media',
              multiple: false,
            },
            multipleMediaTest: {
              type: 'media',
              multiple: true,
            },
          },
        },
        {}
      );

      const expected = {
        singleMediaTest: 60,
        multipleMediaTest: [
          { id: 52, name: 'cat.png', url: '/uploads/cat.png' },
          { id: 58, name: 'cat.png', url: '/uploads/cat.png' },
        ],
      };

      expect(result).toEqual(expected);
    });
  });

  describe('components', () => {
    test('should parse component values recursively', () => {
      const result = cleanData(
        {
          browserState: {
            singleComponentTest: {
              name: 'single',
              time: '11:38',
            },
            repComponentTest: [
              {
                name: 'rep1',
                time: '11:39',
              },
              {
                name: 'rep2',
                time: '11:40',
              },
            ],
          },
          serverState: {},
        },
        {
          attributes: {
            singleComponentTest: {
              type: 'component',
              repeatable: false,
              component: 'basic.rep',
            },
            repComponentTest: {
              type: 'component',
              repeatable: true,
              component: 'basic.rep',
            },
          },
        },
        {
          'basic.rep': {
            attributes: {
              name: {
                type: 'string',
              },
              time: {
                type: 'time',
              },
            },
          },
        }
      );

      const expected = {
        singleComponentTest: { name: 'single', time: '11:38:00' },
        repComponentTest: [
          { name: 'rep1', time: '11:39:00' },
          { name: 'rep2', time: '11:40:00' },
        ],
      };

      expect(result).toEqual(expected);
    });

    test('should parse component values with relations recursively', () => {
      const result = cleanData(
        {
          browserState: {
            component: {
              relation: [{ id: 1, something: true }],
            },
          },
          serverState: {
            component: {
              relation: [],
            },
          },
        },
        {
          attributes: {
            component: {
              type: 'component',
              repeatable: false,
              component: 'basic.relation',
            },
          },
        },
        {
          'basic.relation': {
            attributes: {
              relation: {
                type: 'relation',
              },
            },
          },
        }
      );
      expect(result).toEqual({
        component: {
          relation: {
            connect: [{ id: 1, position: { end: true } }],
            disconnect: [],
          },
        },
      });
    });

    test('should parse deeply nested component values with relations recursively', () => {
      const result = cleanData(
        {
          browserState: {
            component: {
              component2: {
                relation: [{ id: 1, something: true }],
              },
            },
          },
          serverState: {
            component: {
              component2: {
                relation: [],
              },
            },
          },
        },
        {
          attributes: {
            component: {
              type: 'component',
              repeatable: false,
              component: 'basic.nested',
            },
          },
        },
        {
          'basic.relation': {
            attributes: {
              relation: {
                type: 'relation',
              },
            },
          },
          'basic.nested': {
            attributes: {
              component2: {
                type: 'component',
                component: 'basic.relation',
              },
            },
          },
        }
      );
      expect(result).toEqual({
        component: {
          component2: {
            relation: {
              connect: [{ id: 1, position: { end: true } }],
              disconnect: [],
            },
          },
        },
      });
    });
  });

  describe('dynamic zones', () => {
    test('should parse dynamic zone values recursively', () => {
      const result = cleanData(
        {
          browserState: {
            dynamicZoneTest: [
              {
                __component: 'basic.rep',
                time: '00:02',
              },
            ],
          },
          serverState: {
            dynamicZoneTest: [
              {
                __component: 'basic.rep',
                time: '00:02',
              },
            ],
          },
        },
        {
          attributes: {
            dynamicZoneTest: {
              type: 'dynamiczone',
              components: ['basic.rep'],
            },
          },
        },
        {
          'basic.rep': {
            attributes: {
              time: {
                type: 'time',
              },
            },
          },
        }
      );

      const expected = { dynamicZoneTest: [{ __component: 'basic.rep', time: '00:02:00' }] };

      expect(result).toEqual(expected);
    });
  });

  describe('relations', () => {
    const schema = {
      attributes: {
        id: {
          type: 'integer',
        },
        relation: {
          type: 'relation',
        },
        relations: {
          type: 'relation',
        },
        single_component_relation: {
          type: 'component',
          repeatable: false,
          component: 'basic.relation',
        },
        nested_component_relation: {
          type: 'component',
          repeatable: false,
          component: 'basic.nested-relation',
        },
        repeatable_nested_component_relation: {
          type: 'component',
          repeatable: true,
          component: 'basic.nested-relation',
        },
        repeatable_single_component_relation: {
          type: 'component',
          repeatable: true,
          component: 'basic.relation',
        },
        repeatable_repeatable_nested_component: {
          type: 'component',
          repeatable: true,
          component: 'basic.repetable-repeatble-relation',
        },
        dynamic_relations: {
          type: 'dynamiczone',
          components: [
            'basic.nested-relation',
            'basic.repetable-repeatble-relation',
            'basic.relation',
          ],
        },
      },
    };
    const componentsSchema = {
      'basic.relation': {
        uid: 'basic.relation',
        attributes: {
          id: {
            type: 'integer',
          },
          relation: {
            type: 'relation',
            relation: 'oneToMany',
            target: 'api::category.category',
            targetModel: 'api::category.category',
            relationType: 'oneToMany',
          },
          my_name: {
            type: 'string',
          },
        },
      },
      'basic.nested-relation': {
        uid: 'basic.nested-relation',
        attributes: {
          id: {
            type: 'integer',
          },
          relation_component: {
            type: 'component',
            repeatable: false,
            component: 'basic.relation',
          },
        },
      },
      'basic.repetable-repeatble-relation': {
        uid: 'basic.repetable-repeatble-relation',
        attributes: {
          id: {
            type: 'integer',
          },
          repeatable_simple: {
            type: 'component',
            repeatable: true,
            component: 'basic.relation',
          },
        },
      },
    };

    test('given that the browserState for relation is completely different to the serverState for relation the return value should disconnect and connect', () => {
      const result = cleanData(
        {
          browserState: {
            relation: [{ id: 1, something: true }],
          },
          serverState: {
            relation: [{ id: 2, something: true }],
          },
        },
        schema,
        componentsSchema
      );

      expect(result).toStrictEqual({
        relation: {
          connect: [{ id: 1, position: { end: true } }],
          disconnect: [{ id: 2 }],
        },
      });
    });

    test('given that the browserState includes a relation that is not in the server state we should return a connect of length one', () => {
      const result = cleanData(
        {
          browserState: {
            relation: [{ id: 1, something: true }],
          },
          serverState: {
            relation: [],
          },
        },
        schema,
        componentsSchema
      );

      expect(result).toStrictEqual({
        relation: {
          connect: [{ id: 1, position: { end: true } }],
          disconnect: [],
        },
      });
    });

    test('given that the browserState does not include a relation that is in the server state we should return a disconnect of length one', () => {
      const result = cleanData(
        {
          browserState: {
            relation: [],
          },
          serverState: {
            relation: [{ id: 1, something: true }],
          },
        },
        schema,
        componentsSchema
      );

      expect(result).toStrictEqual({
        relation: {
          disconnect: [{ id: 1 }],
          connect: [],
        },
      });
    });

    test('given that the browserState includes a repeatable component with a relation inside that component that is not in the server state we should return a connect of length one', () => {
      const result = cleanData(
        {
          browserState: {
            repeatable_nested_component_relation: [
              {
                id: 1,
                relation_component: {
                  relation: [{ id: 1 }],
                },
              },
              {
                id: 2,
                relation_component: {
                  relation: [{ id: 2 }],
                },
              },
            ],
          },
          serverState: {
            repeatable_nested_component_relation: [
              {
                id: 1,
                relation_component: {
                  relation: [],
                },
              },
            ],
          },
        },
        schema,
        componentsSchema
      );

      expect(result).toStrictEqual({
        repeatable_nested_component_relation: [
          {
            id: 1,
            relation_component: {
              relation: {
                disconnect: [],
                connect: [{ id: 1, position: { end: true } }],
              },
            },
          },
          {
            id: 2,
            relation_component: {
              relation: {
                disconnect: [],
                connect: [{ id: 2, position: { end: true } }],
              },
            },
          },
        ],
      });
    });

    test('given that the browserState does not include a repeatable component with a relation inside that component that the serverState has, we should return a disconnect of length one', () => {
      const result = cleanData(
        {
          browserState: {
            repeatable_nested_component_relation: [
              {
                id: 1,
                relation_component: {
                  relation: [],
                },
              },
              {
                id: 2,
                relation_component: {
                  relation: [{ id: 2 }],
                },
              },
            ],
          },
          serverState: {
            repeatable_nested_component_relation: [
              {
                id: 1,
                relation_component: {
                  relation: [{ id: 1 }],
                },
              },
              {
                id: 2,
                relation_component: {
                  relation: [{ id: 2 }],
                },
              },
            ],
          },
        },
        schema,
        componentsSchema
      );

      expect(result).toStrictEqual({
        repeatable_nested_component_relation: [
          {
            id: 1,
            relation_component: {
              relation: {
                disconnect: [{ id: 1 }],
                connect: [],
              },
            },
          },
          {
            id: 2,
            relation_component: {
              relation: {
                disconnect: [],
                connect: [],
              },
            },
          },
        ],
      });
    });

    test('given that the browserState includes a dynamic zone with a relation inside a component that is not in the server state we should return a connect length of one', () => {
      const result = cleanData(
        {
          browserState: {
            dynamic_relations: [
              {
                __component: 'basic.relation',
                id: 1,
                relation: [{ id: 1 }],
              },
              {
                __component: 'basic.nested-relation',
                id: 2,
                relation_component: {
                  relation: [{ id: 2 }],
                },
              },
              {
                __component: 'basic.repetable-repeatble-relation',
                id: 3,
                repeatable_simple: [
                  {
                    __component: 'basic.relation',
                    id: 1,
                    relation: [{ id: 3 }],
                  },
                ],
              },
            ],
          },
          serverState: {
            dynamic_relations: [
              {
                __component: 'basic.relation',
                id: 1,
                relation: [],
              },
              {
                __component: 'basic.nested-relation',
                id: 2,
                relation_component: {
                  relation: [],
                },
              },
              {
                __component: 'basic.repetable-repeatble-relation',
                id: 3,
                repeatable_simple: [
                  {
                    __component: 'basic.relation',
                    id: 1,
                    relation: [],
                  },
                ],
              },
            ],
          },
        },
        schema,
        componentsSchema
      );

      expect(result).toStrictEqual({
        dynamic_relations: [
          {
            __component: 'basic.relation',
            id: 1,
            relation: {
              connect: [{ id: 1, position: { end: true } }],
              disconnect: [],
            },
          },
          {
            __component: 'basic.nested-relation',
            id: 2,
            relation_component: {
              relation: {
                connect: [{ id: 2, position: { end: true } }],
                disconnect: [],
              },
            },
          },
          {
            __component: 'basic.repetable-repeatble-relation',
            id: 3,
            repeatable_simple: [
              {
                __component: 'basic.relation',
                id: 1,
                relation: {
                  connect: [{ id: 3, position: { end: true } }],
                  disconnect: [],
                },
              },
            ],
          },
        ],
      });
    });

    test('given that the browserState does not include a dynamic zone with a relation inside a component that the server state has we should return a disconnect length of one', () => {
      const result = cleanData(
        {
          browserState: {
            dynamic_relations: [
              {
                __component: 'basic.relation',
                id: 1,
                relation: [],
              },
              {
                __component: 'basic.nested-relation',
                id: 2,
                relation_component: {
                  relation: [],
                },
              },
              {
                __component: 'basic.repetable-repeatble-relation',
                id: 3,
                repeatable_simple: [
                  {
                    __component: 'basic.relation',
                    id: 1,
                    relation: [{ id: 3 }],
                  },
                  {
                    __component: 'basic.relation',
                    id: 2,
                    relation: [],
                  },
                ],
              },
            ],
          },
          serverState: {
            dynamic_relations: [
              {
                __component: 'basic.relation',
                id: 1,
                relation: [{ id: 1 }],
              },
              {
                __component: 'basic.nested-relation',
                id: 2,
                relation_component: {
                  relation: [{ id: 2 }],
                },
              },
              {
                __component: 'basic.repetable-repeatble-relation',
                id: 3,
                repeatable_simple: [
                  {
                    __component: 'basic.relation',
                    id: 1,
                    relation: [{ id: 3 }],
                  },
                  {
                    __component: 'basic.relation',
                    id: 2,
                    relation: [{ id: 4 }],
                  },
                ],
              },
            ],
          },
        },
        schema,
        componentsSchema
      );

      expect(result).toStrictEqual({
        dynamic_relations: [
          {
            __component: 'basic.relation',
            id: 1,
            relation: {
              connect: [],
              disconnect: [{ id: 1 }],
            },
          },
          {
            __component: 'basic.nested-relation',
            id: 2,
            relation_component: {
              relation: {
                connect: [],
                disconnect: [{ id: 2 }],
              },
            },
          },
          {
            __component: 'basic.repetable-repeatble-relation',
            id: 3,
            repeatable_simple: [
              {
                __component: 'basic.relation',
                id: 1,
                relation: {
                  connect: [],
                  disconnect: [],
                },
              },
              {
                __component: 'basic.relation',
                id: 2,
                relation: {
                  connect: [],
                  disconnect: [{ id: 4 }],
                },
              },
            ],
          },
        ],
      });
    });

    test('given that a relation is reordered it should be in the connect array with its new position', () => {
      const result = cleanData(
        {
          browserState: {
            relation: [{ id: 1 }, { id: 2 }],
          },
          serverState: {
            relation: [{ id: 2 }, { id: 1 }],
          },
        },
        schema,
        componentsSchema
      );

      expect(result).toStrictEqual({
        relation: {
          connect: [
            { id: 2, position: { end: true } },
            { id: 1, position: { before: 2 } },
          ],
          disconnect: [],
        },
      });
    });

    test('given a relation is not in the serverState but is added and then re-ordered to another position, it should appear in the connect array with the correct position', () => {
      const result = cleanData(
        {
          browserState: {
            relation: [{ id: 3 }, { id: 1 }, { id: 2 }],
          },
          serverState: {
            relation: [{ id: 1 }, { id: 2 }],
          },
        },
        schema,
        componentsSchema
      );

      expect(result).toStrictEqual({
        relation: {
          connect: [
            { id: 2, position: { end: true } },
            { id: 1, position: { before: 2 } },
            {
              id: 3,
              position: { before: 1 },
            },
          ],
          disconnect: [],
        },
      });
    });

    test('given relations are added that are infront of the existing relations, it should only return the new relations', () => {
      const result = cleanData(
        {
          browserState: {
            relation: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
          },
          serverState: {
            relation: [{ id: 1 }, { id: 2 }],
          },
        },
        schema,
        componentsSchema
      );

      expect(result).toStrictEqual({
        relation: {
          connect: [
            {
              id: 4,
              position: { end: true },
            },
            {
              id: 3,
              position: { before: 4 },
            },
          ],
          disconnect: [],
        },
      });
    });
  });
});
