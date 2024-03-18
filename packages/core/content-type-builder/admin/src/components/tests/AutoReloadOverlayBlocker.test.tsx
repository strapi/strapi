import * as React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { act, screen, renderHook } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import {
  AutoReloadOverlayBlockerProvider,
  useAutoReloadOverlayBlocker,
} from '../AutoReloadOverlayBlocker';

const MAX_ELAPSED_TIME = 30 * 1000;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DesignSystemProvider locale="en">
    <IntlProvider locale="en" messages={{}}>
      <AutoReloadOverlayBlockerProvider>{children}</AutoReloadOverlayBlockerProvider>
    </IntlProvider>
  </DesignSystemProvider>
);

describe('AutoReloadOverlayBlocker', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should lock the app', async () => {
    const { result } = renderHook(useAutoReloadOverlayBlocker, {
      wrapper,
    });

    act(() => {
      result.current.lockAppWithAutoreload?.();
    });

    expect(screen.getByRole('heading', { name: /Waiting for restart/ })).toBeInTheDocument();
  });

  it('should unlock the app', async () => {
    const { result } = renderHook(useAutoReloadOverlayBlocker, {
      wrapper,
    });

    act(() => {
      result.current.lockAppWithAutoreload?.();
    });
    expect(screen.getByRole('heading', { name: /Waiting for restart/ })).toBeInTheDocument();
    act(() => {
      result.current.unlockAppWithAutoreload?.();
    });
    expect(screen.queryByRole('heading', { name: /Waiting for restart/ })).not.toBeInTheDocument();
  });

  it('should show failed message after 30s', async () => {
    const { result } = renderHook(useAutoReloadOverlayBlocker, {
      wrapper,
    });

    act(() => {
      result.current.lockAppWithAutoreload?.();
    });

    expect(screen.getByRole('heading', { name: /Waiting for restart/ })).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(MAX_ELAPSED_TIME));

    expect(
      screen.getByRole('heading', { name: /The restart is taking longer than expected/ })
    ).toBeInTheDocument();
  });
});
