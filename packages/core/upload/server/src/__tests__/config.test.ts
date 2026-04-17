import { config } from '../config';

describe('upload plugin config', () => {
  describe('defaults', () => {
    test('concurrentUploadSize defaults to 1 (serialized)', () => {
      expect(config.default.concurrentUploadSize).toBe(1);
    });
  });

  describe('validator', () => {
    test('accepts an undefined concurrentUploadSize', () => {
      expect(() => config.validator({})).not.toThrow();
    });

    test('accepts a valid integer >= 1', () => {
      expect(() => config.validator({ concurrentUploadSize: 1 })).not.toThrow();
      expect(() => config.validator({ concurrentUploadSize: 5 })).not.toThrow();
    });

    test.each([
      ['zero', 0],
      ['negative', -3],
      ['float', 2.5],
      ['string', '5'],
      ['boolean', true],
      ['null', null],
    ])('rejects %s value', (_label, value) => {
      expect(() => config.validator({ concurrentUploadSize: value })).toThrow(
        /concurrentUploadSize/
      );
    });
  });
});
