import * as React from 'react';

import { renderHook, act } from '@testing-library/react';

import { I18nSharedFieldsLock, useI18nSharedFieldsLock } from '../I18nSharedFieldsLock';

describe('I18nSharedFieldsLock', () => {
  const wrapper =
    (resetKey: string) =>
    ({ children }: { children: React.ReactNode }) => (
      <I18nSharedFieldsLock resetKey={resetKey}>{children}</I18nSharedFieldsLock>
    );

  it('starts locked and unlocks until the reset key changes', () => {
    const { result, rerender } = renderHook(
      () =>
        useI18nSharedFieldsLock('test', (state) => ({
          isUnlocked: state.isUnlocked,
          unlock: state.unlock,
        })),
      { wrapper: wrapper('doc-a:fr') }
    );

    expect(result.current.isUnlocked).toBe(false);

    act(() => {
      result.current.unlock();
    });
    expect(result.current.isUnlocked).toBe(true);

    rerender();
    expect(result.current.isUnlocked).toBe(true);
  });

  it('relocks when the document or locale reset key changes', () => {
    let resetKey = 'doc-a:fr';
    const { result, rerender } = renderHook(
      () =>
        useI18nSharedFieldsLock('test', (state) => ({
          isUnlocked: state.isUnlocked,
          unlock: state.unlock,
        })),
      {
        wrapper: ({ children }) => (
          <I18nSharedFieldsLock resetKey={resetKey}>{children}</I18nSharedFieldsLock>
        ),
      }
    );

    act(() => {
      result.current.unlock();
    });
    expect(result.current.isUnlocked).toBe(true);

    resetKey = 'doc-a:es';
    rerender();
    expect(result.current.isUnlocked).toBe(false);
  });
});
