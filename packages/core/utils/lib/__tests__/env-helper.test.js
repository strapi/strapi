'use strict';

const envHelper = require('../env-helper');

describe('Env helper', () => {
  describe('env without cast', () => {
    test('Returns undefined if env var is not defined', () => {
      expect(envHelper('NO_VAR')).toBeUndefined();
    });

    test('Returns env var as is', () => {
      process.env.WITH_VAR = '';
      expect(envHelper('WITH_VAR')).toEqual('');

      process.env.WITH_VAR = 'test';
      expect(envHelper('WITH_VAR')).toEqual('test');
    });
  });

  describe('env with integer cast', () => {
    test('Returns undefined if var is not defined', () => {
      expect(envHelper.int('NO_VAR')).toBeUndefined();
    });

    test('Returns NaN if var is not castable', () => {
      process.env.NOT_INT_VAR = '';
      expect(envHelper.int('NOT_INT_VAR')).toEqual(Number.NaN);
    });

    test('Returns a valid int when possible', () => {
      process.env.INT_VAR = '123';
      expect(envHelper.int('INT_VAR')).toEqual(123);
    });
  });

  describe('env with float cast', () => {
    test('Returns undefined if var is not defined', () => {
      expect(envHelper.float('NO_VAR')).toBeUndefined();
    });

    test('Returns NaN if var is not castable', () => {
      process.env.NOT_FLOAT_VAR = '';
      expect(envHelper.float('NOT_FLOAT_VAR')).toEqual(Number.NaN);
    });

    test('Returns a valid float when possible', () => {
      process.env.FLOAT_VAR = '123.45';
      expect(envHelper.float('FLOAT_VAR')).toEqual(123.45);
    });
  });

  describe('env with boolean cast', () => {
    test('Returns undefined if var is not defined', () => {
      expect(envHelper.bool('NO_VAR')).toBeUndefined();
    });

    test.each(['', '1', '-1', 'false'])('Returns false if var is not equal to true (%s)', value => {
      process.env.NOT_TRUE = value;
      expect(envHelper.bool('NOT_TRUE')).toEqual(false);
    });

    test('Returns true when using "true"', () => {
      process.env.TRUE_VAR = 'true';
      expect(envHelper.bool('TRUE_VAR')).toEqual(true);
    });

    test('Returns true when using boolean true default Value', () => {
      expect(envHelper.bool('TRUE_VAR', true)).toEqual(true);
    });
  });

  describe('env with json cast', () => {
    test('Returns undefined if var is not defined', () => {
      expect(envHelper.json('NO_VAR')).toBeUndefined();
    });

    test('Throws if var is not a valid json', () => {
      process.env.JSON_VAR = '{"}';
      expect(() => {
        envHelper.json('JSON_VAR');
      }).toThrow('Invalid json environment variable');
    });

    test.each([
      ['123.45', 123.45],
      ['{}', {}],
      ['{ "key": "value" }', { key: 'value' }],
      ['{ "key": 12 }', { key: 12 }],
      ['{ "key": { "subKey": "value" } }', { key: { subKey: 'value' } }],
      ['"some text"', 'some text'],
      ['[12,32]', [12, 32]],
    ])('Returns a valid json when possible (%s)', (input, expected) => {
      process.env.JSON_VAR = input;
      expect(envHelper.json('JSON_VAR')).toEqual(expected);
    });
  });

  describe('env with array cast', () => {
    test('Returns undefined if var is not defined', () => {
      expect(envHelper.array('NO_VAR')).toBeUndefined();
    });

    test('Returns an array even when not an array is passed', () => {
      process.env.NOT_ARRAY_VAR = 'somevalue';
      expect(envHelper.array('NOT_ARRAY_VAR')).toEqual(['somevalue']);
    });

    test('Returns only strings', () => {
      process.env.ARRAY_VAR = '123,456';
      expect(envHelper.array('ARRAY_VAR')).toEqual(['123', '456']);
    });

    test('Returns an array when not using brackets', () => {
      process.env.ARRAY_VAR = 'firstValue, secondValue';
      expect(envHelper.array('ARRAY_VAR')).toEqual(['firstValue', 'secondValue']);
    });

    test('Supports brackets', () => {
      process.env.ARRAY_VAR = '[firstValue, secondValue]';
      expect(envHelper.array('ARRAY_VAR')).toEqual(['firstValue', 'secondValue']);
    });

    test('Supports quotes and spaces', () => {
      process.env.ARRAY_VAR = '  "firstValue" , SecondValue  "';
      expect(envHelper.array('ARRAY_VAR')).toEqual(['firstValue', 'SecondValue  ']);
    });
  });

  describe('env with date cast', () => {
    test('Returns undefined if var is not defined', () => {
      expect(envHelper.date('NO_VAR')).toBeUndefined();
    });

    test('Returns InvalidDate if var is not castable', () => {
      process.env.NOT_DATE_VAR = 'random string';
      expect(envHelper.date('NOT_DATE_VAR').getTime()).toEqual(Number.NaN);
    });

    test('Returns a valid date when possible', () => {
      process.env.DATE_VAR = '2010-02-21T12:34:12';
      expect(envHelper.date('DATE_VAR')).toEqual(new Date(2010, 1, 21, 12, 34, 12));
    });
  });
});
