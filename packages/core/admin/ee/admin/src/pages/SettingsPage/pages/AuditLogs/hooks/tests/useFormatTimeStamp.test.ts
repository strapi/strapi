import { renderHook } from '@tests/utils';

import { useFormatTimeStamp } from '../useFormatTimeStamp';

describe('useFormatTimeStamp', () => {
  it('renders a dash when the audit log date is missing', () => {
    const { result } = renderHook(() => useFormatTimeStamp());

    expect(result.current(null)).toBe('-');
    expect(result.current('')).toBe('-');
  });

  it('formats a real timestamp', () => {
    const { result } = renderHook(() => useFormatTimeStamp());

    const formatted = result.current('2026-06-01T12:00:00.000Z');

    expect(formatted).toContain('2026');
    expect(formatted).toContain(',');
    expect(formatted).not.toBe('-');
  });
});
