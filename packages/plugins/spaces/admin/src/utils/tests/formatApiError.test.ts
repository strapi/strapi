import { formatApiError } from '../formatApiError';

describe('the message shown when a request fails', () => {
  it('is the one the server gave', () => {
    // Server-side validation is where the useful wording lives — which slug is
    // taken, why a space cannot be archived.
    const error = { data: { error: { message: 'A space with the slug "fr" already exists.' } } };

    expect(formatApiError(error)).toBe('A space with the slug "fr" already exists.');
  });

  it('falls back to a plain error’s own message', () => {
    expect(formatApiError(new Error('Network request failed'))).toBe('Network request failed');
  });

  it.each([
    ['nothing at all', undefined],
    ['null', null],
    ['an empty object', {}],
    ['a response with no message', { data: { error: {} } }],
  ])('is a last-resort notice for %s', (_label, error) => {
    expect(formatApiError(error)).toBe('Something went wrong.');
  });
});
