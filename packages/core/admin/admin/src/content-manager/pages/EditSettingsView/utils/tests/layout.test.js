import {
  createLayout,
  formatLayout,
  getFieldSize,
  setFieldSize,
  getRowSize,
  unformatLayout,
} from '../layout';

describe('Content Manager | containers | EditSettingsView | utils | layout', () => {
  describe('createLayout', () => {
    it('should return an array of object with keys rowId and rowContent', () => {
      const data = [
        [
          { name: 'test', size: 4 },
          { name: 'test1', size: 4 },
        ],
        [{ name: 'test2', size: 12 }],
        [
          { name: 'test3', size: 6 },
          { name: 'test4', size: 1 },
        ],
      ];
      const expected = [
        {
          rowId: 0,
          rowContent: [
            { name: 'test', size: 4 },
            { name: 'test1', size: 4 },
          ],
        },
        { rowId: 1, rowContent: [{ name: 'test2', size: 12 }] },
        {
          rowId: 2,
          rowContent: [
            { name: 'test3', size: 6 },
            { name: 'test4', size: 1 },
          ],
        },
      ];

      expect(createLayout(data)).toEqual(expected);
    });
  });

  describe('formatLayout', () => {
    it('Should complete each row so the size is 12', () => {
      const data = [
        {
          rowId: 0,
          rowContent: [
            { name: 'test', size: 4 },
            { name: 'test1', size: 4 },
          ],
        },
        { rowId: 1, rowContent: [{ name: 'test2', size: 12 }] },
        {
          rowId: 2,
          rowContent: [
            { name: 'test3', size: 6 },
            { name: 'test4', size: 1 },
          ],
        },
      ];
      const expected = [
        {
          rowId: 0,
          rowContent: [
            { name: 'test', size: 4 },
            { name: 'test1', size: 4 },
            { name: '_TEMP_', size: 4 },
          ],
        },
        { rowId: 1, rowContent: [{ name: 'test2', size: 12 }] },
        {
          rowId: 2,
          rowContent: [
            { name: 'test3', size: 6 },
            { name: 'test4', size: 1 },
            { name: '_TEMP_', size: 5 },
          ],
        },
      ];

      expect(formatLayout(data)).toEqual(expected);
    });

    it('should complete each row regardless the added _TEMP_ elements', () => {
      const expected = [
        {
          rowId: 0,
          rowContent: [
            { name: 'test', size: 4 },
            { name: 'test1', size: 4 },
            { name: '_TEMP_', size: 4 },
          ],
        },
        { rowId: 1, rowContent: [{ name: 'test2', size: 12 }] },
        {
          rowId: 2,
          rowContent: [
            { name: 'test3', size: 6 },
            { name: 'test4', size: 1 },
            { name: '_TEMP_', size: 5 },
          ],
        },
        {
          rowId: 3,
          rowContent: [
            { name: 'test5', size: 6 },
            { name: 'test6', size: 6 },
          ],
        },
      ];

      expect(formatLayout(expected)).toEqual(expected);
    });
  });

  describe('getFieldSize', () => {
    const fixture = [
      {
        rowContent: [
          {
            name: 'test_1',
            size: 6,
          },
        ],
      },

      {
        rowContent: [
          {
            name: 'test_2',
            size: 12,
          },
        ],
      },
    ];

    const expected = [
      {
        name: 'test_1',
        value: 6,
      },

      {
        name: 'test_2',
        value: 12,
      },

      {
        name: 'test_3',
        value: null,
      },
    ];

    expected.forEach(({ name, value }) => {
      it(`Should return the proper field size for ${name}`, () => {
        expect(getFieldSize(name, fixture)).toBe(value);
      });
    });
  });

  describe('setFieldSize', () => {
    const fixture = [
      {
        rowContent: [
          {
            name: 'test_1',
            size: 6,
          },
        ],
      },
    ];

    const expected = [
      {
        name: 'test_1',
        value: 12,
      },
    ];

    expected.forEach(({ name, value }) => {
      it(`Should set the proper field size for ${name}`, () => {
        const newLayout = setFieldSize(name, value, [...fixture]);

        expect(newLayout[0].rowContent[0].size).toBe(value);
      });
    });
  });

  describe('getRowSize', () => {
    it('should return the sum of the size of all the elements of an array of object', () => {
      const row = [
        { name: 'test', size: 1 },
        { name: 'test1', size: 2 },
        { name: 'test2', size: 3 },
        { name: 'test3', size: 4 },
        { name: 'test4', size: 5 },
      ];

      expect(getRowSize(row)).toBe(15);
    });
  });

  describe('unformatLayout', () => {
    it('Should return an array containing the displayed fields', () => {
      const data = [
        {
          rowId: 0,
          rowContent: [
            {
              name: 'name',
              size: 6,
            },
            {
              name: 'test',
              size: 4,
            },
            {
              name: '_TEMP_',
              size: 2,
            },
          ],
        },

        {
          rowId: 1,
          rowContent: [
            {
              name: 'name1',
              size: 4,
            },
            {
              name: '_TEMP_',
              size: 8,
            },
          ],
        },
      ];
      const expected = [
        [
          { name: 'name', size: 6 },
          { name: 'test', size: 4 },
        ],
        [{ name: 'name1', size: 4 }],
      ];

      expect(unformatLayout(data)).toEqual(expected);
    });
  });
});
