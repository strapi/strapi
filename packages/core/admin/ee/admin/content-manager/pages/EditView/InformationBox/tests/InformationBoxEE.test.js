import React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { RBACContext, useCMEditViewDataManager } from '@strapi/helper-plugin';
import { render as renderRTL, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { STAGE_ATTRIBUTE_NAME, ASSIGNEE_ATTRIBUTE_NAME } from '../constants';
import { InformationBoxEE } from '../InformationBoxEE';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn(),
  useNotification: jest.fn(() => ({
    toggleNotification: jest.fn(),
  })),
}));

const server = setupServer(
  rest.get('*/users', (req, res, ctx) =>
    res(
      ctx.json({
        data: {
          results: [],
          pagination: {
            page: 1,
          },
        },
      })
    )
  ),

  rest.get('*/review-workflows/workflows/', (req, res, ctx) =>
    res(
      ctx.json({
        data: [
          {
            id: 1,
            stages: [
              {
                id: 1,
                color: '#4945FF',
                name: 'Stage 1',
              },
            ],
          },
        ],
      })
    )
  ),

  rest.get('*/license-limit-information', (req, res, ctx) =>
    res(
      ctx.json({
        data: {},
      })
    )
  )
);

const render = (props) => {
  return renderRTL(<InformationBoxEE {...props} />, {
    wrapper({ children }) {
      const store = createStore((state = {}) => state, {
        admin_app: { permissions: fixtures.permissions.app },
      });
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <RBACContext.Provider value={{ allPermissions: fixtures.permissions.allPermissions }}>
          <Provider store={store}>
            <QueryClientProvider client={queryClient}>
              <IntlProvider locale="en" defaultLocale="en">
                <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
              </IntlProvider>
            </QueryClientProvider>
          </Provider>
        </RBACContext.Provider>
      );
    },
  });
};

describe('EE | Content Manager | EditView | InformationBox', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  it('renders the title and body of the Information component', async () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {},
      isCreatingEntry: true,
      layout: {
        options: {
          reviewWorkflows: false,
        },
      },
    });

    const { getByText } = render();

    await waitFor(() => expect(getByText('Information')).toBeInTheDocument());
    await waitFor(() => expect(getByText('Last update')).toBeInTheDocument());
  });

  it('renders neither stage nor assignee select inputs, if no nothing is returned for an entity', async () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {},
      layout: {
        options: {
          reviewWorkflows: false,
        },
      },
    });

    const { queryByRole } = render();

    await waitFor(() => expect(queryByRole('combobox')).not.toBeInTheDocument());
  });

  it('renders stage and assignee select inputs, if both are set on an entity', async () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        [STAGE_ATTRIBUTE_NAME]: {
          id: 1,
          color: '#4945FF',
          name: 'Stage 1',
          worklow: 1,
        },

        [ASSIGNEE_ATTRIBUTE_NAME]: {
          id: 1,
          firstname: 'Firstname',
        },
      },
      layout: {
        uid: 'api::articles:articles',
        options: {
          reviewWorkflows: true,
        },
      },
    });

    const { queryAllByRole } = render();

    await waitFor(() => expect(queryAllByRole('combobox').length).toBe(2));
  });
});
