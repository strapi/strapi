import { unstable_useDocument } from '@strapi/content-manager/strapi-admin';
import { render as renderRTL, waitFor, server } from '@tests/utils';
import { rest } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { AssigneeSelect } from '../AssigneeSelect';

// Mock the content manager hook more comprehensively
jest.mock('@strapi/content-manager/strapi-admin', () => ({
  unstable_useDocument: jest.fn(),
}));

describe('AssigneeSelect', () => {
  beforeEach(() => {
    // Reset the mock implementation before each test
    jest.mocked(unstable_useDocument).mockReturnValue({
      document: {
        documentId: '12345',
        id: 12345,
        ['strapi_assignee']: {
          id: 1,
          firstname: 'John',
          lastname: 'Doe',
        },
      },
      isLoading: false,
      components: {},
      validate: jest.fn(),
      getInitialFormValues: jest.fn(),
      getTitle: jest.fn(),
      refetch: jest.fn(),
    });
  });
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
    const { getByRole } = render();

    const combobox = getByRole('combobox');

    // Add more robust waiting and checking
    await waitFor(
      () => {
        expect(combobox).toHaveValue('John Doe');
      },
      { timeout: 2000 }
    );
  });

  it('renders a disabled select when there are no users to select', async () => {
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

    const { queryByRole } = render();

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

    const { findByText } = render();

    await findByText('An error occurred while fetching users');

    console.error = origConsoleError;
  });

  it('renders an error message, when the assignee update fails', async () => {
    jest.mocked(unstable_useDocument).mockReturnValue({
      components: {},
      isLoading: false,
      validate: jest.fn(),
      getInitialFormValues: jest.fn(),
      getTitle: jest.fn(),
      refetch: jest.fn(),
      document: {
        documentId: '12345',
        id: 12345,
        ['strapi_assignee']: null,
      },
    });

    const origConsoleError = console.error;

    console.error = jest.fn();

    server.use(
      rest.put(
        '/review-workflows/content-manager/collection-types/:contentType/:id/assignee',
        (req, res, ctx) => {
          return res.once(
            ctx.status(500),
            ctx.json({
              error: {
                message: 'Server side error message',
              },
            })
          );
        }
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
