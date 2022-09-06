import cleanData from '../cleanData';

describe('CM || components || EditViewDataManagerProvider || utils || cleanData', () => {
  test('should parse json value', () => {
    const result = cleanData(
      {
        jsonTest: '{\n  "cat": "michka"\n}',
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
        timeTest: '11:38',
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

  test('should parse dynamic zone values recursively', () => {
    const result = cleanData(
      {
        dynamicZoneTest: [
          {
            __component: 'basic.rep',
            time: '00:02',
          },
        ],
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

  test('should cleanup relations properly and only send the ID attribute', () => {
    const result = cleanData(
      {
        relation: {
          add: [{ id: 1, something: true }],
          remove: [{ id: 2, something: true }],
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
        add: [{ id: 1 }],
        remove: [{ id: 2 }],
      },
    });
  });
});
