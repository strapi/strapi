import * as React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { DesignSystemProvider } from '@strapi/design-system';
import { renderHook as renderHookRTL, render as renderRTL } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PropTypes from 'prop-types';
import { QueryClient, QueryClientProvider } from 'react-query';

import { RBACContext } from '../src/index';

import { server } from './server';

const Providers = ({ children }) => {
  const rbacContextValue = React.useMemo(
    () => ({
      allPermissions: fixtures.permissions.allPermissions,
    }),
    []
  );

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // no more errors on the console for tests
        error() {},
      },
    },
  });

  return (
    // en is the default locale of the admin app.
    <DesignSystemProvider locale="en">
      <QueryClientProvider client={queryClient}>
        <RBACContext.Provider value={rbacContextValue}>{children}</RBACContext.Provider>
      </QueryClientProvider>
    </DesignSystemProvider>
  );
};

Providers.propTypes = {
  children: PropTypes.node.isRequired,
};

// eslint-disable-next-line react/jsx-no-useless-fragment
const fallbackWrapper = ({ children }) => <>{children}</>;

/**
 * @type {(ui: React.ReactElement, options?: { renderOptions?: import('@testing-library/react').RenderOptions, userEventOptions?: Parameters<typeof userEvent.setup>[0] }) => import('@testing-library/react').RenderResult & { user: typeof userEvent }}
 */
const render = (ui, { renderOptions, userEventOptions } = {}) => {
  const { wrapper: Wrapper = fallbackWrapper, ...restOptions } = renderOptions ?? {};

  return {
    ...renderRTL(ui, {
      wrapper: ({ children }) => (
        <Providers>
          <Wrapper>{children}</Wrapper>
        </Providers>
      ),
      ...restOptions,
    }),
    user: userEvent.setup(userEventOptions),
  };
};

const renderHook = (hook, options) => {
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

export { render, renderHook, server };
