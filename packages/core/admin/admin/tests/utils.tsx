/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { ConfigureStoreOptions, configureStore } from '@reduxjs/toolkit';
import { fixtures } from '@strapi/admin-test-utils';
import { darkTheme, lightTheme } from '@strapi/design-system';
import {
  fireEvent,
  renderHook as renderHookRTL,
  render as renderRTL,
  waitFor,
  RenderOptions as RTLRenderOptions,
  RenderResult,
  act,
  screen,
  RenderHookOptions,
  RenderHookResult,
  Queries,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouterProps, RouterProvider, createMemoryRouter } from 'react-router-dom';

import { LanguageProvider } from '../src/components/LanguageProvider';
import { Theme } from '../src/components/Theme';
import { reducer as cmAppReducer } from '../src/content-manager/layout';
import { reducer as contentManagerReducer } from '../src/content-manager/modules/reducers';
import { contentManagerApi } from '../src/content-manager/services/api';
import { AppInfoProvider } from '../src/features/AppInfo';
import { AuthProvider, type Permission } from '../src/features/Auth';
import { _internalConfigurationContextProvider as ConfigurationContextProvider } from '../src/features/Configuration';
import { NotificationsProvider } from '../src/features/Notifications';
import { StrapiAppProvider } from '../src/features/StrapiApp';
import { reducer as appReducer } from '../src/reducer';
import { adminApi } from '../src/services/api';

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
  storeConfig?: Partial<ConfigureStoreOptions>;
  permissions?: Permission[];
}

const defaultTestStoreConfig = {
  preloadedState: initialState,
  reducer: {
    [adminApi.reducerPath]: adminApi.reducer,
    admin_app: appReducer,
    'content-manager_app': cmAppReducer,
    [contentManagerApi.reducerPath]: contentManagerApi.reducer,
    'content-manager': contentManagerReducer,
  },
  // @ts-expect-error – this fails.
  middleware: (getDefaultMiddleware) => [
    ...getDefaultMiddleware({
      // Disable timing checks for test env
      immutableCheck: false,
      serializableCheck: false,
    }),
    adminApi.middleware,
    contentManagerApi.middleware,
  ],
};

const Providers = ({ children, initialEntries, storeConfig, permissions = [] }: ProvidersProps) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const store = configureStore(
    // @ts-expect-error – we've not filled up the entire initial state.
    storeConfig ?? defaultTestStoreConfig
  );

  server.use(
    rest.get('/admin/users/me/permissions', (req, res, ctx) =>
      res(
        ctx.json({
          data: [
            ...fixtures.permissions.allPermissions,
            ...permissions,
            {
              id: 314,
              action: 'admin::users.read',
              subject: null,
              properties: {},
              conditions: [],
              actionParameters: {},
            },
          ],
        })
      )
    )
  );

  const router = createMemoryRouter(
    [
      {
        path: '/*',
        element: (
          <Provider store={store}>
            <AuthProvider>
              <QueryClientProvider client={queryClient}>
                <DndProvider backend={HTML5Backend}>
                  <LanguageProvider messages={{}}>
                    <Theme
                      themes={{
                        dark: darkTheme,
                        light: lightTheme,
                      }}
                    >
                      <StrapiAppProvider
                        components={{}}
                        customFields={{
                          customFields: {},
                          get: jest.fn().mockReturnValue({
                            name: 'color',
                            pluginId: 'mycustomfields',
                            type: 'text',
                            icon: jest.fn(),
                            intlLabel: {
                              id: 'mycustomfields.color.label',
                              defaultMessage: 'Color',
                            },
                            intlDescription: {
                              id: 'mycustomfields.color.description',
                              defaultMessage: 'Select any color',
                            },
                            components: {
                              Input: jest.fn().mockResolvedValue({ default: jest.fn() }),
                            },
                          }),
                          getAll: jest.fn(),
                          register: jest.fn(),
                        }}
                        fields={{}}
                        menu={[]}
                        getAdminInjectedComponents={jest.fn()}
                        getPlugin={jest.fn()}
                        plugins={{}}
                        runHookParallel={jest.fn()}
                        runHookWaterfall={jest
                          .fn()
                          .mockImplementation((_name, initialValue) => initialValue)}
                        runHookSeries={jest.fn()}
                        settings={{}}
                      >
                        <NotificationsProvider>
                          <ConfigurationContextProvider
                            showReleaseNotification={false}
                            showTutorials={false}
                            logos={{
                              auth: { default: '' },
                              menu: { default: '' },
                            }}
                            updateProjectSettings={jest.fn()}
                          >
                            <AppInfoProvider
                              autoReload
                              useYarn
                              dependencies={{
                                '@strapi/plugin-documentation': '4.2.0',
                                '@strapi/provider-upload-cloudinary': '4.2.0',
                              }}
                              strapiVersion="4.1.0"
                              communityEdition
                              shouldUpdateStrapi={false}
                            >
                              {children}
                            </AppInfoProvider>
                          </ConfigurationContextProvider>
                        </NotificationsProvider>
                      </StrapiAppProvider>
                    </Theme>
                  </LanguageProvider>
                </DndProvider>
              </QueryClientProvider>
            </AuthProvider>
          </Provider>
        ),
      },
    ],
    {
      initialEntries,
    }
  );

  // en is the default locale of the admin app.
  return <RouterProvider router={router} />;
};

// eslint-disable-next-line react/jsx-no-useless-fragment
const fallbackWrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export interface RenderOptions {
  renderOptions?: RTLRenderOptions;
  userEventOptions?: Parameters<typeof userEvent.setup>[0];
  initialEntries?: MemoryRouterProps['initialEntries'];
  providerOptions?: Pick<ProvidersProps, 'storeConfig' | 'permissions'>;
}

/**
 * @alpha
 * @description A custom render function that wraps the component with the necessary providers,
 * for use of testing components within the Strapi Admin.
 */
const render = (
  ui: React.ReactElement,
  { renderOptions, userEventOptions, initialEntries, providerOptions }: RenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } => {
  const { wrapper: Wrapper = fallbackWrapper, ...restOptions } = renderOptions ?? {};

  return {
    ...renderRTL(ui, {
      wrapper: ({ children }) => (
        <Providers initialEntries={initialEntries} {...providerOptions}>
          <Wrapper>{children}</Wrapper>
        </Providers>
      ),
      ...restOptions,
    }),
    user: userEvent.setup(userEventOptions),
  };
};

/**
 * @alpha
 * @description A custom render-hook function that wraps the component with the necessary providers,
 * for use of testing hooks within the Strapi Admin.
 */
const renderHook = <
  Result,
  Props,
  Q extends Queries,
  Container extends Element | DocumentFragment = HTMLElement,
  BaseElement extends Element | DocumentFragment = Container
>(
  hook: (initialProps: Props) => Result,
  options?: RenderHookOptions<Props, Q, Container, BaseElement> &
    Pick<RenderOptions, 'initialEntries'>
): RenderHookResult<Result, Props> => {
  const { wrapper: Wrapper = fallbackWrapper, initialEntries, ...restOptions } = options ?? {};

  return renderHookRTL(hook, {
    wrapper: ({ children }) => (
      <Providers initialEntries={initialEntries}>
        <Wrapper>{children}</Wrapper>
      </Providers>
    ),
    ...restOptions,
  });
};

export { render, renderHook, waitFor, server, act, screen, fireEvent, defaultTestStoreConfig };
