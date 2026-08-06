import { config } from '../config';

describe('upload plugin config', () => {
  describe('defaults', () => {
    test('concurrentUploadSize defaults to 1 (serialized)', () => {
      expect(config.default.concurrentUploadSize).toBe(1);
    });

    test('concurrentUploadRequests defaults to 1 (serialized)', () => {
      expect(config.default.concurrentUploadRequests).toBe(1);
    });
  });

  describe('validator', () => {
    test('accepts an undefined config', () => {
      expect(() => config.validator({})).not.toThrow();
    });

    test.each(['concurrentUploadSize', 'concurrentUploadRequests'] as const)(
      '%s accepts a valid integer >= 1',
      (key) => {
        expect(() => config.validator({ [key]: 1 })).not.toThrow();
        expect(() => config.validator({ [key]: 5 })).not.toThrow();
      }
    );

    describe.each(['concurrentUploadSize', 'concurrentUploadRequests'] as const)('%s', (key) => {
      test.each([
        ['zero', 0],
        ['negative', -3],
        ['float', 2.5],
        ['string', '5'],
        ['boolean', true],
        ['null', null],
      ])('rejects %s value', (_label, value) => {
        expect(() => config.validator({ [key]: value })).toThrow(new RegExp(key));
      });
    });
  });
});
