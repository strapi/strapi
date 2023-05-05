import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { QueryClientProvider, QueryClient } from 'react-query';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { useNotification } from '@strapi/helper-plugin';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import configureStore from '../../../../../../../admin/src/core/store/configureStore';
import ReviewWorkflowsPage from '..';
import { reducer } from '../reducer';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn().mockReturnValue(jest.fn()),
  // eslint-disable-next-line react/prop-types
  CheckPagePermissions({ children }) {
    return children;
  },
}));

let SHOULD_ERROR = false;

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
  }),

  rest.put(`*/review-workflows/workflows/${FIXTURE_WORKFLOW.id}/stages`, (req, res, ctx) => {
    if (SHOULD_ERROR) {
      return res(ctx.status(500), ctx.json({}));
    }

    return res(ctx.json({}));
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
    <DndProvider backend={HTML5Backend}>
      <QueryClientProvider client={client}>
        <Provider store={store}>
          <IntlProvider locale="en" messages={{}}>
            <ThemeProvider theme={lightTheme}>
              <ReviewWorkflowsPage />
            </ThemeProvider>
          </IntlProvider>
        </Provider>
      </QueryClientProvider>
    </DndProvider>
  );
};

const setup = (props) => {
  return {
    ...render(<ComponentFixture {...props} />),
    user: userEvent.setup(),
  };
};

describe('Admin | Settings | Review Workflow | ReviewWorkflowsPage', () => {
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

  test('handle initial loading state', () => {
    const { getByText } = setup();

    expect(getByText('0 stages')).toBeInTheDocument();
    expect(getByText('Workflow is loading')).toBeInTheDocument();
  });

  test('loading state is not present', () => {
    const { queryByText } = setup();

    expect(queryByText('Workflow is loading')).not.toBeInTheDocument();
  });

  test('display stages', async () => {
    const { getByText, queryByText } = setup();

    await waitFor(() => expect(queryByText('Workflow is loading')).not.toBeInTheDocument());

    await waitFor(() => expect(getByText('1 stage')).toBeInTheDocument());
    expect(getByText('stage-1')).toBeInTheDocument();
  });

  test('Save button is disabled by default', () => {
    const { getByRole } = setup();

    const saveButton = getByRole('button', { name: /save/i });

    expect(saveButton).toBeInTheDocument();
    expect(saveButton.getAttribute('disabled')).toBeDefined();
  });

  test('Save button is enabled after a stage has been added', async () => {
    const { user, getByText, getByRole, queryByText } = setup();

    await waitFor(() => expect(queryByText('Workflow is loading')).not.toBeInTheDocument());

    await user.click(
      getByRole('button', {
        name: /add new stage/i,
      })
    );

    const saveButton = getByRole('button', { name: /save/i });

    expect(getByText('2 stages')).toBeInTheDocument();
    expect(saveButton.hasAttribute('disabled')).toBeFalsy();
  });

  test('Successful Stage update', async () => {
    const toggleNotification = useNotification();
    const { user, getByRole, queryByText } = setup();

    await waitFor(() => expect(queryByText('Workflow is loading')).not.toBeInTheDocument());

    await user.click(
      getByRole('button', {
        name: /add new stage/i,
      })
    );

    fireEvent.change(getByRole('textbox', { name: /stage name/i }), {
      target: { value: 'stage-2' },
    });

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /save/i }));
    });

    expect(toggleNotification).toBeCalledWith({
      type: 'success',
      message: expect.any(Object),
    });
  });

  test('Stage update with error', async () => {
    SHOULD_ERROR = true;
    const toggleNotification = useNotification();
    const { user, getByRole, queryByText } = setup();

    await waitFor(() => expect(queryByText('Workflow is loading')).not.toBeInTheDocument());

    await user.click(
      getByRole('button', {
        name: /add new stage/i,
      })
    );

    fireEvent.change(getByRole('textbox', { name: /stage name/i }), {
      target: { value: 'stage-2' },
    });

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /save/i }));
    });

    expect(toggleNotification).toBeCalledWith({
      type: 'warning',
      message: expect.any(String),
    });
  });

  test('Does not show a delete button if only stage is left', async () => {
    const { queryByRole, queryByText } = setup();

    await waitFor(() => expect(queryByText('Workflow is loading')).not.toBeInTheDocument());

    expect(queryByRole('button', { name: /delete stage/i })).not.toBeInTheDocument();
  });

  test('Show confirmation dialog when a stage was deleted', async () => {
    const { user, getByRole, getAllByRole, queryByText } = setup();

    await waitFor(() => expect(queryByText('Workflow is loading')).not.toBeInTheDocument());

    await user.click(
      getByRole('button', {
        name: /add new stage/i,
      })
    );

    await user.type(getByRole('textbox', { name: /stage name/i }), 'stage-2');

    const deleteButtons = getAllByRole('button', { name: /delete stage/i });

    await user.click(deleteButtons[0]);

    await act(async () => {
      fireEvent.click(getByRole('button', { name: /save/i }));
    });

    expect(getByRole('heading', { name: /confirmation/i })).toBeInTheDocument();
  });
});
