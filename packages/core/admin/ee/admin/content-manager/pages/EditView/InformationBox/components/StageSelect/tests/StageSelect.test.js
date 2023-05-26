import React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { QueryClientProvider, QueryClient } from 'react-query';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

import { StageSelect } from '../StageSelect';
import { STAGE_ATTRIBUTE_NAME } from '../../../constants';

const STAGE_1_STATE_FIXTURE = {
  id: 1,
  color: '#4945FF',
  name: 'Stage 1',
  worklow: 1,
};

const server = setupServer(
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
              {
                id: 2,
                color: '#4945FF',
                name: 'Stage 2',
              },
            ],
          },
        ],
      })
    )
  )
);

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn(),
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

  it('renders an error, if no workflow stage is assigned to the entity', async () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        [STAGE_ATTRIBUTE_NAME]: null,
      },
      layout: { uid: 'api::articles:articles' },
    });

    const { getByText, queryByRole } = setup();

    expect(queryByRole('combobox')).toBeInTheDocument();

    await waitFor(() => expect(getByText(/select a stage/i)).toBeInTheDocument());
  });

  it('renders an enabled select input, if the entity is edited', () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        [STAGE_ATTRIBUTE_NAME]: null,
      },
      isCreatingEntry: false,
      layout: { uid: 'api::articles:articles' },
    });

    const { queryByRole } = setup();
    const select = queryByRole('combobox');

    expect(select).toBeInTheDocument();
  });

  it('renders a select input, if a workflow stage is assigned to the entity', async () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        [STAGE_ATTRIBUTE_NAME]: STAGE_1_STATE_FIXTURE,
      },
      isCreatingEntry: false,
      layout: { uid: 'api::articles:articles' },
    });

    const { queryByRole, queryByTestId, getByText, user } = setup();

    await waitFor(() => expect(queryByTestId('loader')).not.toBeInTheDocument());

    const select = queryByRole('combobox');

    expect(getByText('Stage 1')).toBeInTheDocument();

    await user.click(select);

    expect(getByText('Stage 2')).toBeInTheDocument();
  });
});
