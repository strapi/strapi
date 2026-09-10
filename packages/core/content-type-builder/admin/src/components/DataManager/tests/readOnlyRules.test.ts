import { renderHook } from '@testing-library/react';

import { getReadOnlyRules, registerReadOnlyRule, useReadOnlyRules } from '../readOnlyRules';

describe('readOnlyRules', () => {
  beforeEach(() => {
    // The registry is module state: reset it by replacing every rule with a no-op.
    for (const rule of getReadOnlyRules()) {
      registerReadOnlyRule({ id: rule.id, useRule: () => ({ readOnly: false }) });
    }
  });

  it('is writable when no rule applies', () => {
    const { result } = renderHook(() => useReadOnlyRules());

    expect(result.current).toEqual({ readOnly: false });
  });

  it('returns the first read-only rule with its reason', () => {
    registerReadOnlyRule({ id: 'a', useRule: () => ({ readOnly: false }) });
    registerReadOnlyRule({
      id: 'b',
      useRule: () => ({ readOnly: true, reason: { id: 'b.reason', defaultMessage: 'B' } }),
    });
    registerReadOnlyRule({
      id: 'c',
      useRule: () => ({ readOnly: true, reason: { id: 'c.reason', defaultMessage: 'C' } }),
    });

    const { result } = renderHook(() => useReadOnlyRules());

    expect(result.current).toEqual({
      readOnly: true,
      reason: { id: 'b.reason', defaultMessage: 'B' },
    });
  });

  it('replaces a rule registered twice with the same id', () => {
    registerReadOnlyRule({ id: 'a', useRule: () => ({ readOnly: true }) });
    registerReadOnlyRule({ id: 'a', useRule: () => ({ readOnly: false }) });

    const { result } = renderHook(() => useReadOnlyRules());

    expect(getReadOnlyRules().filter((rule) => rule.id === 'a')).toHaveLength(1);
    expect(result.current).toEqual({ readOnly: false });
  });
});
