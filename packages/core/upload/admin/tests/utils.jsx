import * as React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { DesignSystemProvider } from '@strapi/design-system';
import { RBACContext, NotificationsProvider } from '@strapi/helper-plugin';
import {
  renderHook as renderHookRTL,
  render as renderRTL,
  waitFor,
  act,
  fireEvent,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PropTypes from 'prop-types';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

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
            <RBACContext.Provider value={rbacContextValue}>
              <NotificationsProvider>{children}</NotificationsProvider>
            </RBACContext.Provider>
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

export { render, renderHook, waitFor, server, act, fireEvent, screen };
