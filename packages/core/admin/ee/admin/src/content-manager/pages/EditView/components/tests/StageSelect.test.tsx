import { waitForElementToBeRemoved } from '@testing-library/react';
import { render as renderRTL, waitFor, server } from '@tests/utils';
import { rest } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { Form } from '../../../../../../../../admin/src/components/Form';
import { StageSelect } from '../StageSelect';

/**
 * Reimplement when we have review-workflows working with V5 again – see  https://strapi-inc.atlassian.net/browse/CONTENT-2030
 */
describe.skip('EE | Content Manager | EditView | InformationBox | StageSelect', () => {
  const render = () =>
    renderRTL(<StageSelect />, {
      renderOptions: {
        wrapper: ({ children }) => {
          return (
            <Routes>
              <Route
                path="/content-manager/:collectionType/:slug/:id"
                element={
                  <Form method="PUT" onSubmit={jest.fn()}>
                    {children}
                  </Form>
                }
              />
            </Routes>
          );
        },
      },
      initialEntries: ['/content-manager/collection-types/api::address.address/1234'],
    });

  it('renders a select input, if a workflow stage is assigned to the entity', async () => {
    const { getByRole, queryByTestId, user, findByText } = render();

    await waitForElementToBeRemoved(() => queryByTestId('loader'));

    await findByText('Stage 1');

    await user.click(getByRole('combobox'));

    await findByText('Stage 2');
  });

  it("renders the select as disabled with a hint, if there aren't any stages", async () => {
    server.use(
      rest.get('*/content-manager/:kind/:uid/:id/stages', (req, res, ctx) => {
        return res.once(ctx.json({ data: [] }));
      })
    );

    const { queryByRole, queryByTestId, findByText } = render();

    await waitForElementToBeRemoved(() => queryByTestId('loader'));

    await waitFor(() => expect(queryByRole('combobox')).toHaveAttribute('aria-disabled', 'true'));
    await findByText('You don’t have the permission to update this stage.');
  });
});
