import { ApplicationError, isApplicationError, isErrorOfType } from '../errors';

const LegacyApplicationError = class ApplicationError extends Error {
  name = 'ApplicationError';

  details = {};
};

describe('isApplicationError', () => {
  test('recognizes application errors created by another module instance', () => {
    let DuplicateApplicationError: typeof ApplicationError;

    jest.isolateModules(() => {
      DuplicateApplicationError =
        jest.requireActual<typeof import('../errors')>('../errors').ApplicationError;
    });

    const error = new DuplicateApplicationError('Plugin middleware failed');

    expect(error).not.toBeInstanceOf(ApplicationError);
    expect(isApplicationError(error)).toBe(true);
  });

  test.each([null, 'ApplicationError', new Error('Unrelated error')])(
    'rejects non-error value %p',
    (value) => {
      expect(isApplicationError(value)).toBe(false);
    }
  );

  test('recognizes application errors created before cross-copy branding', () => {
    const error = new LegacyApplicationError('Legacy plugin failed');

    expect(isErrorOfType(error, ApplicationError)).toBe(true);
    expect(isApplicationError(error)).toBe(true);
  });
});
