/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { configureStore } from '@reduxjs/toolkit';
import { fixtures } from '@strapi/admin-test-utils';
import { DesignSystemProvider, darkTheme, lightTheme } from '@strapi/design-system';
import { NotificationsProvider, Permission, RBACContext } from '@strapi/helper-plugin';
import {
  renderHook as renderHookRTL,
  render as renderRTL,
  waitFor,
  RenderOptions as RTLRenderOptions,
  RenderResult,
  act,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';

import { LanguageProvider } from '../src/components/LanguageProvider';
import { ThemeToggleProvider } from '../src/components/ThemeToggleProvider';
// @ts-expect-error – no types yet.
import ModelsContext from '../src/content-manager/contexts/ModelsContext';
import { AdminContextProvider } from '../src/contexts/admin';
import { ConfigurationContextProvider } from '../src/contexts/configuration';

import { server } from './server';
import { initialState } from './store';

setLogger({
  log: () => {},
  warn: () => {},
  error: () => {},
});

interface ProvidersProps {
  children: React.ReactNode;
  initialEntries?: MemoryRouterProps['initialEntries'];
}

const Providers = ({ children, initialEntries }: ProvidersProps) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const store = configureStore({
    preloadedState: initialState,
    reducer: (state = initialState) => state,
  });

  // en is the default locale of the admin app.
  return (
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <ThemeToggleProvider
          themes={{
            light: lightTheme,
            dark: darkTheme,
          }}
        >
          <DesignSystemProvider locale="en">
            <QueryClientProvider client={queryClient}>
              <DndProvider backend={HTML5Backend}>
                <LanguageProvider
                  localeNames={{
                    en: 'english',
                  }}
                  messages={{}}
                >
                  <NotificationsProvider>
                    <RBACContext.Provider
                      value={{
                        refetchPermissions: jest.fn(),
                        allPermissions: [
                          ...fixtures.permissions.allPermissions,
                          {
                            id: 314,
                            action: 'admin::users.read',
                            subject: null,
                            properties: {},
                            conditions: [],
                            actionParameters: {},
                          },
                        ] as Permission[],
                      }}
                    >
                      <ModelsContext.Provider value={{ refetchData: jest.fn() }}>
                        <AdminContextProvider getAdminInjectedComponents={jest.fn()}>
                          <ConfigurationContextProvider
                            showReleaseNotification={false}
                            showTutorials={false}
                            updateProjectSettings={jest.fn()}
                            logos={{
                              auth: { default: '' },
                              menu: { default: '' },
                            }}
                          >
                            {children}
                          </ConfigurationContextProvider>
                        </AdminContextProvider>
                      </ModelsContext.Provider>
                    </RBACContext.Provider>
                  </NotificationsProvider>
                </LanguageProvider>
              </DndProvider>
            </QueryClientProvider>
          </DesignSystemProvider>
        </ThemeToggleProvider>
      </MemoryRouter>
    </Provider>
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

export { render, renderHook, waitFor, server, act, screen };
