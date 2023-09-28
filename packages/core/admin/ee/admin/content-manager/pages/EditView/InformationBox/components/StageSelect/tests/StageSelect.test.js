import React from 'react';

import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { render, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient } from 'react-query';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { StageSelect } from '../StageSelect';

const server = setupServer(
  ...[
    rest.get('*/content-manager/:kind/:uid/:id/stages', (req, res, ctx) =>
      res(
        ctx.json({
          data: [
            {
              id: 1,
              color: '#4945FF',
              name: 'Stage 1',
            },

            {
              id: 2,
              color: '#4945FF',
              name: 'Stage 2',
            },
          ],
        })
      )
    ),

    rest.get('*/license-limit-information', (req, res, ctx) => res(ctx.json({}))),
  ]
);

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn().mockReturnValue({
    initialData: {
      id: 1,
      strapi_stage: {
        id: 1,
        color: '#4945FF',
        name: 'Stage 1',
      },
    },
    isCreatingEntry: false,
    isSingleType: false,
    layout: { uid: 'api::articles:articles' },
  }),
  useNotification: jest.fn(() => ({
    toggleNotification: jest.fn(),
  })),
}));

const setup = (props) => {
  return {
    user: userEvent.setup(),
    ...render(<StageSelect {...props} />, {
      wrapper({ children }) {
        const store = createStore((state = {}) => state, {});
        const queryClient = new QueryClient({
          defaultOptions: {
            queries: {
              retry: false,
            },
          },
        });

        return (
          <Provider store={store}>
            <QueryClientProvider client={queryClient}>
              <IntlProvider locale="en" defaultLocale="en">
                <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
              </IntlProvider>
            </QueryClientProvider>
          </Provider>
        );
      },
    }),
  };
};

describe('EE | Content Manager | EditView | InformationBox | StageSelect', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a select input, if a workflow stage is assigned to the entity', async () => {
    const { queryByRole, getByTestId, getByText, user } = setup();

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    await waitFor(() => expect(getByText('Stage 1')).toBeInTheDocument());

    await user.click(queryByRole('combobox'));

    await waitFor(() => expect(getByText('Stage 2')).toBeInTheDocument());
  });

  it("renders the select as disabled with a hint, if there aren't any stages", async () => {
    server.use(
      rest.get('*/content-manager/:kind/:uid/:id/stages', (req, res, ctx) => {
        return res.once(ctx.json({ data: [] }));
      })
    );

    const { queryByRole, getByText, getByTestId } = setup();

    await waitForElementToBeRemoved(() => getByTestId('loader'));

    await waitFor(() => expect(queryByRole('combobox')).toHaveAttribute('aria-disabled', 'true'));
    await waitFor(() =>
      expect(getByText('You don’t have the permission to update this stage.')).toBeInTheDocument()
    );
  });
});
