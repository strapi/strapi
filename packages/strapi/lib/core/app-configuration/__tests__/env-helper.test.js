const envHelper = require('../env-helper');

describe('Env helper', () => {
  describe('env without cast', () => {
    test('Returns undefined if not env var defined', () => {
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

    test('Returns NaN if var is castable', () => {
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

    test('Returns NaN if var is castable', () => {
      process.env.NOT_FLOAT_VAR = '';
      expect(envHelper.float('NOT_FLOAT_VAR')).toEqual(Number.NaN);
    });

    test('Returns a valid float when possible', () => {
      process.env.FLOAT_VAR = '123.45';
      expect(envHelper.float('FLOAT_VAR')).toEqual(123.45);
    });
  });
});
