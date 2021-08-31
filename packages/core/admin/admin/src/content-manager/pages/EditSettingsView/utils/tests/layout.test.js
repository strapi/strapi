import { createLayout, formatLayout, getInputSize, getRowSize, unformatLayout } from '../layout';

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

  describe('getInputSize', () => {
    it('Should return 6 if the type is unknown, undefined or text', () => {
      expect(getInputSize(undefined)).toBe(6);
      expect(getInputSize('unkown')).toBe(6);
      expect(getInputSize('text')).toBe(6);
    });

    it('Should return 12 if the type is either json, component or richtext', () => {
      expect(getInputSize('json')).toBe(12);
      expect(getInputSize('richtext')).toBe(12);
      expect(getInputSize('component')).toBe(12);
    });

    it('Should return 4 if the type is boolean', () => {
      expect(getInputSize('boolean')).toBe(4);
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
