import { renderHook } from '@testing-library/react-hooks';

import { useCollator } from '../useCollator';

describe('useCollator', () => {
  it('should return the Intl.Collator class', () => {
    const { result } = renderHook(() => useCollator('en'));

    expect(result.current).toBeInstanceOf(Intl.Collator);
  });

  it('should pass options to the Intl.Collator class if I pass them to the hook', () => {
    const { result } = renderHook(() => useCollator('en', { sensitivity: 'base' }));

    expect(result.current.resolvedOptions().sensitivity).toBe('base');
  });

  it('should return me a new Intl.Collator if I pass a new locale or options object', () => {
    const { result, rerender } = renderHook(({ locale, options }) => useCollator(locale, options), {
      initialProps: {
        locale: 'en',
        options: { sensitivity: 'base' },
      },
    });

    const first = result.current;

    rerender({
      locale: 'en',
      options: { sensitivity: 'accent' },
    });

    const second = result.current;

    expect(second).not.toBe(first);

    rerender({
      locale: 'fr',
      options: { sensitivity: 'accent' },
    });

    const third = result.current;

    expect(third).not.toBe(second);
    expect(third).not.toBe(first);

    rerender({
      locale: 'en',
      options: { sensitivity: 'base' },
    });

    expect(result.current).toBe(first);
  });
});
