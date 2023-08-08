import * as React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { DesignSystemProvider } from '@strapi/design-system';
import { renderHook as renderHookRTL, render as renderRTL, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PropTypes from 'prop-types';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

import { RBACContext } from '../src/index';

import { server } from './server';

const Providers = ({ children, initialEntries }) => {
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
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        error() {},
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

Providers.defaultProps = {
  initialEntries: undefined,
};

Providers.propTypes = {
  children: PropTypes.node.isRequired,
  initialEntries: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object])),
};

// eslint-disable-next-line react/jsx-no-useless-fragment
const fallbackWrapper = ({ children }) => <>{children}</>;

/**
 * @typedef {object} RenderOptions
 * @property {import('@testing-library/react').RenderOptions | undefined} renderOptions
 * @property {Parameters<typeof userEvent.setup>[0] | undefined} userEventOptions
 * @property {Array<string | { pathname?: string; search?: string; hash?: string; }>} initialEntries
 */

/**
 * @type {(ui: React.ReactElement, options?: RenderOptions) => import('@testing-library/react').RenderResult & { user: typeof userEvent }}
 */
const render = (ui, { renderOptions, userEventOptions, initialEntries } = {}) => {
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

export { render, renderHook, waitFor, server };
