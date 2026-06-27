import * as React from 'react';

import { render, renderHook, screen } from '@testing-library/react';

import { createContext } from '../Context';

/**
 * Catches render-time errors thrown by context consumers rendered outside their
 * provider, so Jest doesn't treat the thrown error as an unhandled exception.
 */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <span>{this.state.error.message}</span>;
    }

    return this.props.children;
  }
}

describe('createContext', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Suppress React's own console.error output for expected boundary catches.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  /**
   * Happy path: the selector runs and returns the correct value when the
   * consumer is rendered inside its provider.
   */
  it('returns the selected value when rendered inside its provider', () => {
    const [TestProvider, useTestContext] = createContext<{ value: string }>('TestContext');

    const { result } = renderHook(() => useTestContext('Consumer', (state) => state.value), {
      wrapper: ({ children }) => <TestProvider value="hello">{children}</TestProvider>,
    });

    expect(result.current).toBe('hello');
  });

  /**
   * Core regression for issue #26795.
   *
   * Before the fix: shouldThrowOnMissingContext was an optional parameter with no
   * runtime default. Omitting the argument set it to `undefined` at runtime — even
   * though the TypeScript generic default (ShouldThrow = true) implied it would be
   * `true`. The `if (shouldThrowOnMissingContext)` branch was therefore never taken
   * for missing-context calls, causing the selector to silently return `undefined`.
   *
   * Consumers such as useRBAC then called that undefined value as a function:
   *   checkUserHasPermissions(permissions)
   *   → TypeError: checkUserHasPermissions is not a function
   *
   * After the fix: `shouldThrowOnMissingContext: ShouldThrow = true as ShouldThrow`
   * gives the parameter an actual runtime default of `true`, so a missing context
   * throws a clear, identifiable error instead of silently returning undefined.
   */
  it('throws by default (no third argument) when rendered outside its provider', () => {
    const [, useTestContext] = createContext<{ value: string }>('TestContext');

    // Intentionally omit the third argument — this is the exact call signature
    // used by useRBAC, useMenu, AuthenticatedLayout, PrivateRoute, and others.
    const Consumer = () => <span>{useTestContext('Consumer', (state) => state.value)}</span>;

    render(
      <ErrorBoundary>
        <Consumer />
      </ErrorBoundary>
    );

    // Must throw a named, identifiable error — NOT a TypeError from calling undefined().
    expect(screen.getByText('`Consumer` must be used within `TestContext`')).toBeInTheDocument();
  });

  /**
   * Opt-out path: passing `false` explicitly must still return undefined without
   * throwing, preserving backwards compatibility for callers that intentionally
   * consume optional contexts.
   */
  it('returns undefined for missing context when throwing is explicitly disabled', () => {
    const [, useTestContext] = createContext<{ value: string }>('TestContext');

    const { result } = renderHook(() => useTestContext('Consumer', (state) => state.value, false));

    expect(result.current).toBeUndefined();
  });

  /**
   * HMR module-identity mismatch regression.
   *
   * During Vite HMR, editing a module that contains a createContext() call causes
   * the module to re-evaluate. This creates a *new* context object. The refreshed
   * AuthProvider sets up the new context, but components that were already mounted
   * before the HMR cycle completed still hold a reference to the *old* context
   * object — which now has no provider wrapping it.
   *
   * This test encodes that scenario deterministically:
   *   - `providerContext` simulates the context object created in the *new* module
   *     (the one AuthProvider wraps).
   *   - `consumerContext` simulates the context object created in the *old* module
   *     (the one useRBAC/useMenu still reference).
   *   - The consumer reads from consumerContext, but only providerContext has a
   *     provider — so ctx === undefined at the selector level.
   *
   * Before the fix: returns undefined → calling it as a function → TypeError.
   * After the fix:  throws a named error → React can recover via error boundary.
   */
  it('throws a named error (not TypeError) when a consumer reads from a different context instance than its provider', () => {
    // Simulates: AuthProvider uses the context from the NEW module after HMR.
    const [ProviderFromNewModule] = createContext<{ value: string }>('Auth');

    // Simulates: useRBAC still references the context from the OLD module.
    const [, useContextFromOldModule] = createContext<{ value: string }>('Auth');

    const Consumer = () => (
      // This selector runs against the OLD context — ctx will be undefined
      // because only ProviderFromNewModule (the NEW context) has a provider.
      <span>{useContextFromOldModule('useRBAC', (state) => state.value)}</span>
    );

    render(
      // Only the NEW module's provider is mounted — exactly what HMR produces.
      <ProviderFromNewModule value="token">
        <ErrorBoundary>
          <Consumer />
        </ErrorBoundary>
      </ProviderFromNewModule>
    );

    // Must be a named context error, not a TypeError from calling undefined().
    expect(screen.getByText('`useRBAC` must be used within `Auth`')).toBeInTheDocument();
  });
});
