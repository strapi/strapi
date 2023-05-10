import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { QueryClientProvider, QueryClient } from 'react-query';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { MemoryRouter } from 'react-router-dom';

import configureStore from '../../../../../../../../../admin/src/core/store/configureStore';
import ReviewWorkflowsListView from '..';
import { reducer } from '../../../reducer';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line react/prop-types
  CheckPagePermissions({ children }) {
    return children;
  },
}));

const FIXTURE_WORKFLOW = {
  id: 1,
  stages: [
    {
      id: 1,
      name: 'stage-1',
    },
  ],
};

const server = setupServer(
  rest.get('*/review-workflows/workflows', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [FIXTURE_WORKFLOW],
      })
    );
  })
);

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const ComponentFixture = () => {
  const store = configureStore([], [reducer]);

  return (
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <Provider store={store}>
          <IntlProvider locale="en" messages={{}}>
            <ThemeProvider theme={lightTheme}>
              <ReviewWorkflowsListView />
            </ThemeProvider>
          </IntlProvider>
        </Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

const setup = (props) => {
  return {
    ...render(<ComponentFixture {...props} />),
    user: userEvent.setup(),
  };
};

describe('Admin | Settings | Review Workflow | ListView', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('Loading state', () => {
    const { getByText } = setup();

    expect(getByText('Workflows are loading')).toBeInTheDocument();
    expect(getByText('Review Workflows')).toBeInTheDocument();
    expect(
      getByText(
        'Manage content review stages and collaborate during content creation from draft to publication'
      )
    ).toBeInTheDocument();
  });

  test('loading state is not present', async () => {
    const { queryByText } = setup();

    await waitFor(() => expect(queryByText('Workflows are loading')).not.toBeInTheDocument());

    expect(queryByText('Workflows are loading')).not.toBeInTheDocument();
  });

  test('displays a list of workflows', async () => {
    const { getByRole, getByText, queryByText } = setup();

    await waitFor(() => expect(queryByText('Workflows are loading')).not.toBeInTheDocument());

    expect(getByText('Default workflow')).toBeInTheDocument();
    expect(getByRole('link', { name: /Edit Default workflow/gi })).toHaveAttribute(
      'href',
      `/settings/review-workflows/${FIXTURE_WORKFLOW.id}`
    );
  });
});
