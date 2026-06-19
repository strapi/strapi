import { getBulkMoveErrorMessage } from '../getBulkMoveErrorMessage';

describe('getBulkMoveErrorMessage', () => {
  it('returns the server message when present', () => {
    expect(getBulkMoveErrorMessage({ message: 'Folder not found' }, 'Fallback')).toBe(
      'Folder not found'
    );
  });

  it('returns the fallback for unknown error shapes', () => {
    expect(getBulkMoveErrorMessage(undefined, 'Fallback')).toBe('Fallback');
    expect(getBulkMoveErrorMessage({ status: 500 }, 'Fallback')).toBe('Fallback');
  });
});
