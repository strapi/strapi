import { formatDuration } from '../formatDuration';

describe('formatDuration', () => {
  test('properly format seconds', () => {
    expect(formatDuration(1)).toBe('00:00:01');
    expect(formatDuration(60)).toBe('00:01:00');
    expect(formatDuration(3600)).toBe('01:00:00');
  });
});
