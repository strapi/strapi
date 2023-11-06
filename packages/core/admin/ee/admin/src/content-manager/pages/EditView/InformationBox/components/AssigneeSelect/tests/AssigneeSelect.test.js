import React from 'react';

import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { render, waitFor, server } from '@tests/utils';
import { rest } from 'msw';

import { ASSIGNEE_ATTRIBUTE_NAME } from '../../../constants';
import { AssigneeSelect } from '../AssigneeSelect';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn(),
}));

useCMEditViewDataManager.mockReturnValue({
  initialData: {
    [ASSIGNEE_ATTRIBUTE_NAME]: null,
  },
  layout: { uid: 'api::articles:articles' },
});

describe('EE | Content Manager | EditView | InformationBox | AssigneeSelect', () => {
  beforeAll(() => {
    jest.clearAllMocks();
  });

  it('renders a select with users, none is selected', async () => {
    const { getByRole, getByText, queryByText, user } = render(<AssigneeSelect />);

    await waitFor(() => expect(queryByText('John Doe')).not.toBeInTheDocument());

    await user.click(getByRole('combobox'));

    await waitFor(() => expect(getByText('John Doe')).toBeInTheDocument());
  });

  it('renders a select with users, first user is selected', async () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        [ASSIGNEE_ATTRIBUTE_NAME]: {
          id: 1,
          firstname: 'John',
          lastname: 'Doe',
        },
      },
      layout: { uid: 'api::articles:articles' },
    });

    const { queryByRole } = render(<AssigneeSelect />);

    await waitFor(() => expect(queryByRole('combobox')).toHaveValue('John Doe'));
  });

  it('renders a disabled select when there are no users to select', async () => {
    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        [ASSIGNEE_ATTRIBUTE_NAME]: {
          id: 1,
          firstname: 'John',
          lastname: 'Doe',
        },
      },
      layout: { uid: 'api::articles:articles' },
    });

    server.use(
      rest.get('/admin/users', (req, res, ctx) => {
        return res.once(
          ctx.json({
            data: {
              results: [],
            },
          })
        );
      })
    );

    const { queryByRole } = render(<AssigneeSelect />);

    await waitFor(() => expect(queryByRole('combobox')).toHaveAttribute('aria-disabled', 'true'));
  });

  it('renders an error message, when fetching user fails', async () => {
    const origConsoleError = console.error;

    console.error = jest.fn();

    server.use(
      rest.get('/admin/users', (req, res, ctx) => {
        return res.once(
          ctx.status(500),
          ctx.json({
            data: {
              error: {
                message: 'Error message',
              },
            },
          })
        );
      })
    );

    const { getByText } = render(<AssigneeSelect />);

    await waitFor(() =>
      expect(getByText('An error occurred while fetching users')).toBeInTheDocument()
    );

    console.error = origConsoleError;
  });

  it('renders an error message, when the assignee update fails', async () => {
    const origConsoleError = console.error;

    useCMEditViewDataManager.mockReturnValue({
      initialData: {
        id: 1,
        [ASSIGNEE_ATTRIBUTE_NAME]: null,
      },
      layout: { uid: 'api::articles:articles' },
    });

    console.error = jest.fn();

    server.use(
      rest.put(
        '/admin/content-manager/collection-types/:contentType/:id/assignee',
        (req, res, ctx) => {
          return res.once(
            ctx.status(500),
            ctx.json({
              data: {
                error: {
                  message: 'Server side error message',
                },
              },
            })
          );
        }
      )
    );

    const { getByRole, getByText, user } = render(<AssigneeSelect />);

    await user.click(getByRole('combobox'));
    await user.click(getByText('John Doe'));

    await waitFor(() =>
      expect(getByText('Request failed with status code 500')).toBeInTheDocument()
    );

    console.error = origConsoleError;
  });
});
