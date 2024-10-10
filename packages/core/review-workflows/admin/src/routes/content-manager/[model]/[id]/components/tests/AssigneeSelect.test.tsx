import { unstable_useDocument } from '@strapi/content-manager/strapi-admin';
import { render as renderRTL, waitFor, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { AssigneeSelect } from '../AssigneeSelect';

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  unstable_useDocument: jest.fn().mockReturnValue({
    document: {
      documentId: '12345',
      id: 12345,
      ['strapi_assignee']: {
        id: 1,
        firstname: 'John',
        lastname: 'Doe',
      },
    },
  }),
}));

describe('AssigneeSelect', () => {
  const render = () =>
    renderRTL(<AssigneeSelect />, {
      renderOptions: {
        wrapper: ({ children }) => {
          return (
            <Routes>
              <Route path="/content-manager/:collectionType/:slug/:id" element={children} />
            </Routes>
          );
        },
      },
      initialEntries: ['/content-manager/collection-types/api::address.address/12345'],
    });

  it('renders a select with users, none is selected', async () => {
    const { getByRole, queryByText, user, findByText } = render();

    await waitFor(() => expect(queryByText('John Doe')).not.toBeInTheDocument());

    await user.click(getByRole('combobox'));
    await waitFor(() => expect(queryByText('Loading content...')).not.toBeInTheDocument());

    await findByText('John Doe');
  });

  it('renders a select with users, first user is selected', async () => {
    const { queryByRole } = render();

    await waitFor(() => expect(queryByRole('combobox')).toHaveValue('John Doe'));
  });

  it('renders a disabled select when there are no users to select', async () => {
    server.use(
      http.get(
        '/admin/users',
        () => {
          return HttpResponse.json({
            data: {
              results: [],
            },
          });
        },
        { once: true }
      )
    );

    const { queryByRole } = render();

    await waitFor(() => expect(queryByRole('combobox')).toHaveAttribute('aria-disabled', 'true'));
  });

  it('renders an error message, when fetching user fails', async () => {
    const origConsoleError = console.error;

    console.error = jest.fn();

    server.use(
      http.get(
        '/admin/users',
        () => {
          return HttpResponse.json({
            data: {
              error: {
                message: 'Error message',
              },
            },
          });
        },
        { once: true }
      )
    );

    const { findByText } = render();

    await findByText('An error occurred while fetching users');

    console.error = origConsoleError;
  });

  it('renders an error message, when the assignee update fails', async () => {
    jest.mocked(unstable_useDocument).mockReturnValue({
      components: {},
      isLoading: false,
      validate: jest.fn(),
      document: {
        documentId: '12345',
        id: 12345,
        ['strapi_assignee']: null,
      },
    });

    const origConsoleError = console.error;

    console.error = jest.fn();

    server.use(
      http.put(
        '/review-workflows/content-manager/collection-types/:contentType/:id/assignee',
        () => {
          return HttpResponse.json({
            error: {
              message: 'Server side error message',
            },
          });
        },
        { once: true }
      )
    );

    const { getByRole, getByText, queryByText, user, findByText } = render();

    await user.click(getByRole('combobox'));
    await waitFor(() => expect(queryByText('Loading content...')).not.toBeInTheDocument());
    await user.click(getByText('John Doe'));

    await findByText('Server side error message');

    console.error = origConsoleError;
  });
});
