import { recursivelyFindRelationPaths } from '../recursivelyFindRelationPaths';

describe('recursivelyFindRelationPaths', () => {
  test('given that there are no relational fields in the attributes it should return an empty array', () => {
    const components = {};
    const attributes = {
      field1: {
        type: 'string',
      },
      field2: {
        type: 'string',
      },
    };

    const actual = recursivelyFindRelationPaths(components)(attributes);

    expect(actual).toEqual([]);
  });

  test('given that there are relational fields in the attributes it should return those paths in the array', () => {
    const components = {};
    const attributes = {
      field1: {
        type: 'string',
      },
      field2: {
        type: 'relation',
      },
      field3: {
        type: 'relation',
      },
    };

    const actual = recursivelyFindRelationPaths(components)(attributes);

    expect(actual).toEqual(['field2', 'field3']);
  });

  test('given that there are component fields in the attributes but those components do not have relational fields it should return an empty array', () => {
    const components = {
      component1: {
        attributes: {
          field1: {
            type: 'string',
          },
          field2: {
            type: 'string',
          },
        },
      },
    };
    const attributes = {
      field1: {
        type: 'string',
      },
      field2: {
        type: 'component',
        component: 'component1',
      },
    };

    const actual = recursivelyFindRelationPaths(components)(attributes);

    expect(actual).toEqual([]);
  });

  test('given that there is a component field in the attributes which has a relational field it should return the path to that field', () => {
    const components = {
      component1: {
        attributes: {
          field1: {
            type: 'string',
          },
          field2: {
            type: 'relation',
          },
        },
      },
    };
    const attributes = {
      field1: {
        type: 'string',
      },
      field2: {
        type: 'component',
        component: 'component1',
      },
    };

    const actual = recursivelyFindRelationPaths(components)(attributes);

    expect(actual).toEqual(['field2.field2']);
  });

  test('given that there are nested components and the nested component has a relational field it should return the path to that field', () => {
    const components = {
      component1: {
        attributes: {
          field1: {
            type: 'string',
          },
          field2: {
            component: 'component2',
            type: 'component',
          },
        },
      },
      component2: {
        attributes: {
          field1: {
            type: 'relation',
          },
        },
      },
    };
    const attributes = {
      field1: {
        type: 'string',
      },
      field2: {
        type: 'component',
        component: 'component1',
      },
    };

    const actual = recursivelyFindRelationPaths(components)(attributes);

    expect(actual).toEqual(['field2.field2.field1']);
  });

  test('given that there are deeply nested components where the deepest has a relational field, it should return the path to that field', () => {
    const components = {
      component1: {
        attributes: {
          field1: {
            type: 'string',
          },
          field2: {
            component: 'component2',
            type: 'component',
          },
        },
      },
      component2: {
        attributes: {
          field1: {
            component: 'component3',
            type: 'component',
          },
        },
      },
      component3: {
        attributes: {
          field1: {
            type: 'relation',
          },
        },
      },
    };
    const attributes = {
      field1: {
        type: 'string',
      },
      field2: {
        type: 'component',
        component: 'component1',
      },
    };

    const actual = recursivelyFindRelationPaths(components)(attributes);

    expect(actual).toEqual(['field2.field2.field1.field1']);
  });

  test('given that there are nested components where the multiple components and fields have relations, it should return an array to reflect this.', () => {
    const components = {
      component1: {
        attributes: {
          field1: {
            type: 'string',
          },
          field2: {
            component: 'component2',
            type: 'component',
          },
          field3: {
            type: 'relation',
          },
        },
      },
      component2: {
        attributes: {
          field1: {
            component: 'component3',
            type: 'component',
          },
        },
      },
      component3: {
        attributes: {
          field1: {
            type: 'relation',
          },
        },
      },
    };
    const attributes = {
      field1: {
        type: 'relation',
      },
      field2: {
        type: 'component',
        component: 'component1',
      },
    };

    const actual = recursivelyFindRelationPaths(components)(attributes);

    expect(actual).toEqual(['field1', 'field2.field2.field1.field1', 'field2.field3']);
  });
});
