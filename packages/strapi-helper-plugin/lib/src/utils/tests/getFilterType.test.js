import getFilterType from '../getFilterType';

describe('HELPER PLUGIN | utils | getFilterType', () => {
  describe('Text types', () => {
    const expected = [
      {
        id: 'components.FilterOptions.FILTER_TYPES.=',
        value: '=',
      },
      {
        id: 'components.FilterOptions.FILTER_TYPES._ne',
        value: '_ne',
      },
      {
        id: 'components.FilterOptions.FILTER_TYPES._lt',
        value: '_lt',
      },
      {
        id: 'components.FilterOptions.FILTER_TYPES._lte',
        value: '_lte',
      },
      {
        id: 'components.FilterOptions.FILTER_TYPES._gt',
        value: '_gt',
      },
      {
        id: 'components.FilterOptions.FILTER_TYPES._gte',
        value: '_gte',
      },
      {
        id: 'components.FilterOptions.FILTER_TYPES._contains',
        value: '_contains',
      },
      {
        id: 'components.FilterOptions.FILTER_TYPES._containss',
        value: '_containss',
      },
      {
        id: 'components.FilterOptions.FILTER_TYPES._in',
        value: '_in',
      },
      {
        id: 'components.FilterOptions.FILTER_TYPES._nin',
        value: '_nin',
      },
    ];

    it('should generate the expected array if type is text', () => {
      const type = 'text';
      expect(getFilterType(type)).toEqual(expected);
    });

    it('should generate the expected array if type is string', () => {
      const type = 'string';
      expect(getFilterType(type)).toEqual(expected);
    });

    it('should generate the expected array if type is password', () => {
      const type = 'password';
      expect(getFilterType(type)).toEqual(expected);
    });

    it('should generate the expected array if type is email', () => {
      const type = 'email';
      expect(getFilterType(type)).toEqual(expected);
    });
  });

  describe('Number and timestamp types', () => {
    const expected = [
      {
        id: 'components.FilterOptions.FILTER_TYPES.=',
        value: '=',
      },
      {
        id: 'components.FilterOptions.FILTER_TYPES._ne',
        value: '_ne',
      },
      {
        id: 'components.FilterOptions.FILTER_TYPES._lt',
        value: '_lt',
      },
      {
        id: 'components.FilterOptions.FILTER_TYPES._lte',
        value: '_lte',
      },
      {
        id: 'components.FilterOptions.FILTER_TYPES._gt',
        value: '_gt',
      },
      {
        id: 'components.FilterOptions.FILTER_TYPES._gte',
        value: '_gte',
      },
    ];

    it('should generate the expected array if type is integer', () => {
      const type = 'integer';
      expect(getFilterType(type)).toEqual(expected);
    });

    it('should generate the expected array if type is biginteger', () => {
      const type = 'biginteger';
      expect(getFilterType(type)).toEqual(expected);
    });

    it('should generate the expected array if type is float', () => {
      const type = 'float';
      expect(getFilterType(type)).toEqual(expected);
    });

    it('should generate the expected array if type is decimal', () => {
      const type = 'decimal';
      expect(getFilterType(type)).toEqual(expected);
    });

    it('should generate the expected array if type is date', () => {
      const type = 'date';
      expect(getFilterType(type)).toEqual(expected);
    });

    it('should generate the expected array if type is datetime', () => {
      const type = 'datetime';
      expect(getFilterType(type)).toEqual(expected);
    });

    it('should generate the expected array if type is time', () => {
      const type = 'time';
      expect(getFilterType(type)).toEqual(expected);
    });

    it('should generate the expected array if type is timestamp', () => {
      const type = 'timestamp';
      expect(getFilterType(type)).toEqual(expected);
    });

    it('should generate the expected array if type is timestampUpdate', () => {
      const type = 'timestampUpdate';
      expect(getFilterType(type)).toEqual(expected);
    });
  });

  describe('Other types', () => {
    const expected = [
      {
        id: 'components.FilterOptions.FILTER_TYPES.=',
        value: '=',
      },
      {
        id: 'components.FilterOptions.FILTER_TYPES._ne',
        value: '_ne',
      },
    ];

    it('should generate the expected array if type is size', () => {
      const type = 'size';
      expect(getFilterType(type)).toEqual(expected);
    });
  });
});
