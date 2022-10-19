import cleanData from '../cleanData';

describe('CM || components || EditViewDataManagerProvider || utils || cleanData', () => {
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
      singleComponentTest: { name: 'single', time: '11:38' },
      repComponentTest: [
        { name: 'rep1', time: '11:39' },
        { name: 'rep2', time: '11:40' },
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
          connect: [{ id: 1 }],
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
            connect: [{ id: 1 }],
            disconnect: [],
          },
        },
      },
    });
  });

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
        serverState: {},
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

    const expected = { dynamicZoneTest: [{ __component: 'basic.rep', time: '00:02' }] };

    expect(result).toEqual(expected);
  });

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
      {
        attributes: {
          relation: {
            type: 'relation',
          },
        },
      },
      {}
    );

    expect(result).toStrictEqual({
      relation: {
        connect: [{ id: 1 }],
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
      {
        attributes: {
          relation: {
            type: 'relation',
          },
        },
      },
      {}
    );

    expect(result).toStrictEqual({
      relation: {
        connect: [{ id: 1 }],
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
      {
        attributes: {
          relation: {
            type: 'relation',
          },
        },
      },
      {}
    );

    expect(result).toStrictEqual({
      relation: {
        disconnect: [{ id: 1 }],
        connect: [],
      },
    });
  });
});
