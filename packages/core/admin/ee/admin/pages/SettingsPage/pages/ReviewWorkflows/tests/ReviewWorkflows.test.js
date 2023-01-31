import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { QueryClientProvider, QueryClient } from 'react-query';

import { ThemeProvider, lightTheme } from '@strapi/design-system';

import configureStore from '../../../../../../../admin/src/core/store/configureStore';
import ReviewWorkflowsPage from '..';
import { reducer } from '../reducer';
import { useReviewWorkflows } from '../hooks/useReviewWorkflows';

jest.mock('../hooks/useReviewWorkflows', () => ({
  ...jest.requireActual('../hooks/useReviewWorkflows'),
  useReviewWorkflows: jest.fn().mockReturnValue({
    workflows: {
      status: 'loading',
      data: null,
    },
  }),
}));

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
    <QueryClientProvider client={client}>
      <Provider store={store}>
        <IntlProvider locale="en" messages={{}}>
          <ThemeProvider theme={lightTheme}>
            <ReviewWorkflowsPage />
          </ThemeProvider>
        </IntlProvider>
      </Provider>
    </QueryClientProvider>
  );
};

const setup = (props) => render(<ComponentFixture {...props} />);

describe('Admin | Settings | Review Workflow | ReviewWorkflowsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handle initial loading state', () => {
    const { getByText } = setup();

    expect(getByText('0 stages')).toBeInTheDocument();
    expect(getByText('Workflow is loading')).toBeInTheDocument();
  });

  test('handle loaded stage', () => {
    useReviewWorkflows.mockReturnValue({
      workflows: {
        status: 'success',
        data: [
          {
            id: 1,
            stages: [
              {
                id: 1,
                name: 'stage-1',
              },
            ],
          },
        ],
      },
    });

    const { getByText, queryByText } = setup();

    expect(getByText('1 stage')).toBeInTheDocument();
    expect(queryByText('Workflow is loading')).not.toBeInTheDocument();
    expect(getByText('stage-1')).toBeInTheDocument();
  });
});
