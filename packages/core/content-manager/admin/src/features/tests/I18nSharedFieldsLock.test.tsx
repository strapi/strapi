import * as React from 'react';

import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';

import { I18nSharedFieldsLock, useI18nSharedFieldsLock } from '../I18nSharedFieldsLock';

describe('I18nSharedFieldsLock', () => {
  it('starts locked and stays unlocked across rerenders', () => {
    const { result, rerender } = renderHook(
      () =>
        useI18nSharedFieldsLock('test', (state) => ({
          isUnlocked: state.isUnlocked,
          unlock: state.unlock,
          relock: state.relock,
        })),
      {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <I18nSharedFieldsLock>{children}</I18nSharedFieldsLock>
        ),
      }
    );

    expect(result.current.isUnlocked).toBe(false);

    act(() => {
      result.current.unlock();
    });
    expect(result.current.isUnlocked).toBe(true);

    rerender();
    expect(result.current.isUnlocked).toBe(true);

    act(() => {
      result.current.relock();
    });
    expect(result.current.isUnlocked).toBe(false);
  });

  it('relocks when the provider is remounted for another document or locale', () => {
    let lockKey = 'doc-a:fr';
    const { result, rerender } = renderHook(
      () =>
        useI18nSharedFieldsLock('test', (state) => ({
          isUnlocked: state.isUnlocked,
          unlock: state.unlock,
        })),
      {
        wrapper: ({ children }) => (
          <I18nSharedFieldsLock key={lockKey}>{children}</I18nSharedFieldsLock>
        ),
      }
    );

    act(() => {
      result.current.unlock();
    });
    expect(result.current.isUnlocked).toBe(true);

    lockKey = 'doc-a:es';
    rerender();
    expect(result.current.isUnlocked).toBe(false);
  });

  it('keeps a nested provider locked when the outer one is unlocked', () => {
    const Outer = () => {
      const { isUnlocked, unlock } = useI18nSharedFieldsLock('outer', (state) => state);
      return (
        <button type="button" onClick={unlock}>
          outer {String(isUnlocked)}
        </button>
      );
    };
    const Inner = () => {
      const isUnlocked = useI18nSharedFieldsLock('inner', (state) => state.isUnlocked);
      return <span>inner {String(isUnlocked)}</span>;
    };

    render(
      <I18nSharedFieldsLock>
        <Outer />
        <I18nSharedFieldsLock>
          <Inner />
        </I18nSharedFieldsLock>
      </I18nSharedFieldsLock>
    );

    fireEvent.click(screen.getByRole('button', { name: 'outer false' }));

    expect(screen.getByRole('button', { name: 'outer true' })).toBeInTheDocument();
    expect(screen.getByText('inner false')).toBeInTheDocument();
  });
});
