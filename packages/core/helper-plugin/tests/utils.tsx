/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { DesignSystemProvider } from '@strapi/design-system';
import {
  renderHook as renderHookRTL,
  render as renderRTL,
  waitFor,
  RenderOptions as RTLRenderOptions,
  RenderResult,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';

import { Permission, RBACContext, RBACContextValue } from '../src/features/RBAC';

import { server } from './server';

interface ProvidersProps {
  children: React.ReactNode;
  initialEntries?: MemoryRouterProps['initialEntries'];
}

const Providers = ({ children, initialEntries }: ProvidersProps) => {
  const rbacContextValue: RBACContextValue = React.useMemo(
    () => ({
      allPermissions: fixtures.permissions.allPermissions as unknown as Permission[],
      refetchPermissions: jest.fn(),
    }),
    []
  );

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // no more errors on the console for tests
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        onError() {},
      },
    },
  });

  return (
    // en is the default locale of the admin app.
    <MemoryRouter initialEntries={initialEntries}>
      <IntlProvider locale="en" textComponent="span">
        <DesignSystemProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <RBACContext.Provider value={rbacContextValue}>{children}</RBACContext.Provider>
          </QueryClientProvider>
        </DesignSystemProvider>
      </IntlProvider>
    </MemoryRouter>
  );
};

// eslint-disable-next-line react/jsx-no-useless-fragment
const fallbackWrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export interface RenderOptions {
  renderOptions?: RTLRenderOptions;
  userEventOptions?: Parameters<typeof userEvent.setup>[0];
  initialEntries?: MemoryRouterProps['initialEntries'];
}

const render = (
  ui: React.ReactElement,
  { renderOptions, userEventOptions, initialEntries }: RenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } => {
  const { wrapper: Wrapper = fallbackWrapper, ...restOptions } = renderOptions ?? {};

  return {
    ...renderRTL(ui, {
      wrapper: ({ children }) => (
        <Providers initialEntries={initialEntries}>
          <Wrapper>{children}</Wrapper>
        </Providers>
      ),
      ...restOptions,
    }),
    user: userEvent.setup(userEventOptions),
  };
};

const renderHook: typeof renderHookRTL = (hook, options) => {
  const { wrapper: Wrapper = fallbackWrapper, ...restOptions } = options ?? {};

  return renderHookRTL(hook, {
    wrapper: ({ children }) => (
      <Providers>
        <Wrapper>{children}</Wrapper>
      </Providers>
    ),
    ...restOptions,
  });
};

export { render, renderHook, waitFor, server, act };
