/* eslint-disable check-file/filename-naming-convention */
import { renderHook } from '@testing-library/react';

import { useDeviceType } from '../useDeviceType';

describe('useDeviceType', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('should detect mobile devices', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current).toBe('mobile');
  });

  it('should detect Android mobile devices', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 Mobile',
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current).toBe('mobile');
  });

  it('should detect tablet devices', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current).toBe('tablet');
  });

  it('should detect Android tablet devices', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Linux; Android 9; SM-T830) AppleWebKit/537.36',
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current).toBe('tablet');
  });

  it('should detect desktop devices', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current).toBe('desktop');
  });

  it('should default to desktop for unknown user agents', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Unknown Device',
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current).toBe('desktop');
  });
});
