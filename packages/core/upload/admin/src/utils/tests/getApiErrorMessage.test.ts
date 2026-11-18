import { getApiErrorMessage } from '../getApiErrorMessage';

describe('getApiErrorMessage', () => {
  it('returns the server message when present', () => {
    expect(getApiErrorMessage({ message: 'Folder not found' })).toBe('Folder not found');
  });

  it('returns the message untouched when it is a machine-readable code', () => {
    expect(getApiErrorMessage({ message: 'FileTooBig' })).toBe('FileTooBig');
  });

  it('returns undefined for unknown error shapes', () => {
    expect(getApiErrorMessage(undefined)).toBeUndefined();
    expect(getApiErrorMessage({ status: 500 })).toBeUndefined();
  });

  it('returns undefined when the message is an empty string', () => {
    expect(getApiErrorMessage({ message: '' })).toBeUndefined();
  });
});
