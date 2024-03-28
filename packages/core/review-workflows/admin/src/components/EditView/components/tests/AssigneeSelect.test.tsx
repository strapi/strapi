import { render as renderRTL, waitFor, server } from '@tests/utils';
import { rest } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { Form } from '../../../../../../../../admin/src/components/Form';
import { AssigneeSelect } from '../AssigneeSelect';
import { ASSIGNEE_ATTRIBUTE_NAME } from '../constants';

/**
 * Reimplement when we have review-workflows working with V5 again – see  https://strapi-inc.atlassian.net/browse/CONTENT-2031
 */
describe.skip('EE | Content Manager | EditView | InformationBox | AssigneeSelect', () => {
  const render = (initialValues = {}) =>
    renderRTL(<AssigneeSelect />, {
      renderOptions: {
        wrapper: ({ children }) => {
          return (
            <Routes>
              <Route
                path="/content-manager/:collectionType/:slug/:id"
                element={
                  <Form initialValues={initialValues} method="PUT" onSubmit={jest.fn()}>
                    {children}
                  </Form>
                }
              />
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

    await findByText('John Doe');
  });

  it('renders a select with users, first user is selected', async () => {
    const { queryByRole } = render({
      [ASSIGNEE_ATTRIBUTE_NAME]: {
        id: 1,
        firstname: 'John',
        lastname: 'Doe',
      },
    });

    await waitFor(() => expect(queryByRole('combobox')).toHaveValue('John Doe'));
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

    const { queryByRole } = render({
      [ASSIGNEE_ATTRIBUTE_NAME]: {
        id: 1,
        firstname: 'John',
        lastname: 'Doe',
      },
    });

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
    const origConsoleError = console.error;

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

    const { getByRole, getByText, user, findByText } = render({
      [ASSIGNEE_ATTRIBUTE_NAME]: null,
    });

    await user.click(getByRole('combobox'));
    await user.click(getByText('John Doe'));

    await findByText('There was an unknown error response from the API');

    console.error = origConsoleError;
  });
});
