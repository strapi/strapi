import { Table, useQueryParams } from '@strapi/admin/strapi-admin';
import { errors } from '@strapi/utils';
import { within } from '@testing-library/react';
import { render as renderRTL, waitFor, server } from '@tests/utils';
import { rest } from 'msw';
import { Route, Routes } from 'react-router-dom';

import {
  ConfirmBulkActionDialog,
  ConfirmBulkActionDialogProps,
  ConfirmDialogPublishAll,
} from '../ConfirmBulkActionDialog';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  /**
   * TODO: can we remove this mock by instead passing a value to `initialEntries`?
   */
  useQueryParams: jest.fn(() => [
    {
      query: {
        plugins: {
          i18n: {
            locale: 'en',
          },
        },
      },
    },
  ]),
}));

describe('ConfirmBulkActionDialog', () => {
  const Component = (props?: Partial<ConfirmBulkActionDialogProps>) => (
    <ConfirmBulkActionDialog
      isOpen={false}
      onToggleDialog={jest.fn()}
      dialogBody={<div data-testid="dialog-body" />}
      endAction={<div data-testid="end-action" />}
      {...props}
    />
  );

  it('should toggle the dialog', () => {
    const { rerender, queryByRole, getByRole, getByTestId } = renderRTL(<Component />);

    expect(queryByRole('alertdialog')).not.toBeInTheDocument();

    rerender(<Component isOpen />);

    expect(getByRole('alertdialog')).toBeInTheDocument();
    expect(getByTestId('dialog-body')).toBeInTheDocument();
    expect(getByTestId('end-action')).toBeInTheDocument();
  });
});

describe('ConfirmDialogPublishAll', () => {
  const render = () => ({
    ...renderRTL(
      <ConfirmDialogPublishAll
        isOpen
        onConfirm={jest.fn()}
        onToggleDialog={jest.fn()}
        isConfirmButtonLoading
      />,
      {
        renderOptions: {
          wrapper: ({ children }) => (
            <Routes>
              <Route
                path="/content-manager/:collectionType/:slug"
                element={
                  <Table.Root defaultSelectedRows={[{ id: 1 }, { id: 2 }]}>{children}</Table.Root>
                }
              />
            </Routes>
          ),
        },
        initialEntries: ['/content-manager/collection-types/api::address.address'],
      }
    ),
  });

  it('should show a default message if there are not draft relations', async () => {
    const { findByText, queryByText, findByRole } = render();

    await findByRole('alertdialog');

    expect(
      queryByText('not published yet and might lead to unexpected behavior')
    ).not.toBeInTheDocument();

    expect(await findByText('Are you sure you want to publish these entries?')).toBeInTheDocument();
  });

  // TODO skipping these tests for now as there is a bug with the draft relation count that will be worked on separately
  // see RFC "Count draft relations" in Notion
  it.skip('should show the warning message with just 1 draft relation and 2 entries', async () => {
    server.use(
      rest.get(
        '/content-manager/collection-types/:contentType/actions/countManyEntriesDraftRelations',
        (req, res, ctx) => {
          return res.once(
            ctx.status(200),
            ctx.json({
              data: 1,
            })
          );
        }
      )
    );

    const { getByRole, findByRole } = render();

    await findByRole('alertdialog');

    within(getByRole('alertdialog')).getByText(/1 relation out of 2 entries is/i);
  });

  it.skip('should show the warning message with 2 draft relations and 2 entries', async () => {
    server.use(
      rest.get(
        '/content-manager/collection-types/:contentType/actions/countManyEntriesDraftRelations',
        (req, res, ctx) => {
          return res.once(
            ctx.status(200),
            ctx.json({
              data: 2,
            })
          );
        }
      )
    );

    const { getByRole, findByRole } = render();

    await findByRole('alertdialog');

    within(getByRole('alertdialog')).getByText(/2 relations out of 2 entries are/i);
  });

  it.skip('should not show the Confirmation component if there is an error coming from the API', async () => {
    const ERROR_MSG = 'The request has failed';

    server.use(
      rest.get(
        '/content-manager/collection-types/:contentType/actions/countManyEntriesDraftRelations',
        (req, res, ctx) => {
          return res.once(
            ctx.status(500),
            ctx.json({
              error: new errors.ApplicationError(ERROR_MSG),
            })
          );
        }
      )
    );

    const { queryByRole, findByText } = render();

    await waitFor(() => expect(queryByRole('dialog')).not.toBeInTheDocument());
    await findByText(ERROR_MSG);
  });

  it.skip('should show the warning message with 2 draft relations and 2 entries even if the locale param is not passed', async () => {
    // @ts-expect-error – TODO, move to use initialEntries on the render function.
    useQueryParams.mockImplementation(() => [
      {
        query: {
          page: 1,
          pageSize: 10,
          sort: 'name:ASC',
        },
      },
    ]);

    server.use(
      rest.get(
        '/content-manager/collection-types/:contentType/actions/countManyEntriesDraftRelations',
        (req, res, ctx) => {
          return res.once(
            ctx.json({
              data: 2,
            })
          );
        }
      )
    );

    const { getByRole, findByRole } = render();

    await findByRole('alertdialog');
    within(getByRole('alertdialog')).getByText(/2 relations out of 2 entries are/i);
  });
});
