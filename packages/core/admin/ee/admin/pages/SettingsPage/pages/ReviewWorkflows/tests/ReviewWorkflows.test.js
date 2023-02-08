import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { QueryClientProvider, QueryClient } from 'react-query';
import userEvent from '@testing-library/user-event';

import { ThemeProvider, lightTheme } from '@strapi/design-system';

import configureStore from '../../../../../../../admin/src/core/store/configureStore';
import ReviewWorkflowsPage from '..';
import { reducer } from '../reducer';
import { useReviewWorkflows } from '../hooks/useReviewWorkflows';

jest.mock('../hooks/useReviewWorkflows', () => ({
  ...jest.requireActual('../hooks/useReviewWorkflows'),
  useReviewWorkflows: jest.fn().mockReturnValue(),
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line react/prop-types
  CheckPagePermissions: ({ children }) => <>{children}</>,
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

const user = userEvent.setup();

describe('Admin | Settings | Review Workflow | ReviewWorkflowsPage', () => {
  beforeEach(() => {
    jest.restoreAllMocks();

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
  });

  test('handle initial loading state', () => {
    useReviewWorkflows.mockReturnValue({
      workflows: {
        status: 'loading',
        data: [],
      },
    });

    const { getByText } = setup();

    expect(getByText('0 stages')).toBeInTheDocument();
    expect(getByText('Workflow is loading')).toBeInTheDocument();
  });

  test('loading state is not present', () => {
    const { queryByText } = setup();

    expect(queryByText('Workflow is loading')).not.toBeInTheDocument();
  });

  test('display stages', () => {
    const { getByText } = setup();

    expect(getByText('1 stage')).toBeInTheDocument();
    expect(getByText('stage-1')).toBeInTheDocument();
  });

  test('Save button is disabled by default', async () => {
    const { getByRole } = setup();

    const saveButton = getByRole('button', { name: /save/i });

    expect(saveButton).toBeInTheDocument();
    expect(saveButton.getAttribute('disabled')).toBeDefined();
  });

  test('Save button is enabled after a stage has been added', async () => {
    const { getByText, getByRole } = setup();

    await user.click(
      getByRole('button', {
        name: /add new stage/i,
      })
    );

    const saveButton = getByRole('button', { name: /save/i });

    expect(getByText('2 stages')).toBeInTheDocument();
    expect(saveButton.hasAttribute('disabled')).toBeFalsy();
  });
});
