import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { useNotification } from '@strapi/helper-plugin';
import { fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';

import ReviewWorkflowsPage from '..';
import configureStore from '../../../../../../../admin/src/core/store/configureStore';
import { reducer } from '../reducer';

const notificationMock = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => notificationMock),
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

const setup = (props) => {
  return {
    ...render(<ReviewWorkflowsPage {...props} />, {
      wrapper({ children }) {
        const store = configureStore([], [reducer]);
        const client = new QueryClient({
          defaultOptions: {
            queries: {
              retry: false,
            },
          },
        });

        return (
          <DndProvider backend={HTML5Backend}>
            <QueryClientProvider client={client}>
              <Provider store={store}>
                <IntlProvider locale="en" messages={{}}>
                  <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
                </IntlProvider>
              </Provider>
            </QueryClientProvider>
          </DndProvider>
        );
      },
    }),
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
  });

  test('handle initial loading state', () => {
    const { getByText } = setup();

    expect(getByText('0 stages')).toBeInTheDocument();
    expect(getByText('Workflow is loading')).toBeInTheDocument();
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
    const { user, getByRole, queryByText } = setup();

    await waitFor(() => expect(queryByText('Workflow is loading')).not.toBeInTheDocument());

    await user.click(
      getByRole('button', {
        name: /add new stage/i,
      })
    );

    await user.type(getByRole('textbox', { name: /stage name/i }), 'stage-2');

    /**
     * @note using `user.click` does not fire the form onSubmit event.
     */
    fireEvent.click(getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(notificationMock).toBeCalledWith({
        type: 'success',
        message: expect.any(Object),
      })
    );
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

    await user.type(getByRole('textbox', { name: /stage name/i }), 'stage-2');

    fireEvent.click(getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(toggleNotification).toBeCalledWith({
        type: 'warning',
        message: expect.any(String),
      })
    );
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

    fireEvent.click(getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(getByRole('heading', { name: /confirmation/i })).toBeInTheDocument()
    );
  });
});
