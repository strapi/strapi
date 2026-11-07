import { errorFromUnknown, errorMessageFromUnknown } from '../unknown-error';

describe('unknown errors', () => {
  test('keeps an Error and its message', () => {
    const error = new Error('missing stream-chain');

    expect(errorFromUnknown(error)).toBe(error);
    expect(errorMessageFromUnknown(error)).toBe('missing stream-chain');
  });

  test('uses a string as the message', () => {
    expect(errorFromUnknown('disk full').message).toBe('disk full');
    expect(errorMessageFromUnknown('disk full')).toBe('disk full');
  });

  test('uses a string message from an error-like object', () => {
    expect(errorFromUnknown({ message: 'socket closed' }).message).toBe('socket closed');
    expect(errorMessageFromUnknown({ message: 'socket closed' })).toBe('socket closed');
  });

  test('does not stringify a plain object', () => {
    expect(errorFromUnknown({ code: 'ENOENT' }).message).toBe('Unknown error');
    expect(errorMessageFromUnknown({ code: 'ENOENT' })).toBe('Unknown error');
  });
});
