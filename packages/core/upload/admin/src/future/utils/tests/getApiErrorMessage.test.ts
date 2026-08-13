import { getApiErrorMessage } from '../getApiErrorMessage';

describe('getApiErrorMessage', () => {
  it('returns the server message when present', () => {
    expect(getApiErrorMessage({ message: 'Folder not found' }, 'Fallback')).toBe(
      'Folder not found'
    );
  });

  it('returns the fallback for unknown error shapes', () => {
    expect(getApiErrorMessage(undefined, 'Fallback')).toBe('Fallback');
    expect(getApiErrorMessage({ status: 500 }, 'Fallback')).toBe('Fallback');
  });

  it('returns the fallback when the message is an empty string', () => {
    expect(getApiErrorMessage({ message: '' }, 'Fallback')).toBe('Fallback');
  });
});
