import { ApplicationError, isApplicationError, isErrorOfType } from '../errors';

const THIRD_PARTY_ERROR_MESSAGE = 'postgres://user:secret@db/app';

const LegacyApplicationError = class ApplicationError extends Error {
  name = 'ApplicationError';

  details = {};
};

const LookalikeApplicationError = class ApplicationError extends Error {};

const BRANDED_NON_ERROR = {
  [Symbol.for('strapi.ApplicationError')]: true,
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

  test('rejects third-party application errors without Strapi details', () => {
    const error = new LookalikeApplicationError(THIRD_PARTY_ERROR_MESSAGE);

    expect(isApplicationError(error)).toBe(false);
  });

  test('rejects branded values that are not errors', () => {
    expect(isApplicationError(BRANDED_NON_ERROR)).toBe(false);
  });
});
