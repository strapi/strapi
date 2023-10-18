import React from 'react';

import { Table, useQueryParams } from '@strapi/helper-plugin';
import { within } from '@testing-library/react';
import { render as renderRTL, waitFor, server } from '@tests/utils';
import { rest } from 'msw';

import { ConfirmBulkActionDialog, ConfirmDialogPublishAll } from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
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
  const Component = (props) => (
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

    expect(queryByRole('dialog')).not.toBeInTheDocument();

    rerender(<Component isOpen />);

    expect(getByRole('dialog')).toBeInTheDocument();
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
            <Table.Root defaultSelectedEntries={[1, 2]}>{children}</Table.Root>
          ),
        },
      }
    ),
  });

  it('should show a default message if there are not draft relations', async () => {
    const { findByText, getByRole, queryByText } = render();

    await waitFor(() => expect(getByRole('dialog')).toBeInTheDocument());

    expect(
      queryByText('not published yet and might lead to unexpected behavior')
    ).not.toBeInTheDocument();

    expect(await findByText('Are you sure you want to publish these entries?')).toBeInTheDocument();
  });

  it('should show the warning message with just 1 draft relation and 2 entries', async () => {
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

    const { getByRole } = render();

    await waitFor(() => {
      const publishDialog = getByRole('dialog');
      expect(publishDialog).toBeInTheDocument();
      within(publishDialog).getByText(/1 relation out of 2 entries is/i);
    });
  });

  it('should show the warning message with 2 draft relations and 2 entries', async () => {
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

    const { getByRole } = render();

    await waitFor(() => {
      const publishDialog = getByRole('dialog');
      expect(publishDialog).toBeInTheDocument();
      within(publishDialog).getByText(/2 relations out of 2 entries are/i);
    });
  });

  it('should not show the Confirmation component if there is an error coming from the API', async () => {
    server.use(
      rest.get(
        '/content-manager/collection-types/:contentType/actions/countManyEntriesDraftRelations',
        (req, res, ctx) => {
          return res.once(
            ctx.status(500),
            ctx.json({
              errorMessage: 'Error',
            })
          );
        }
      )
    );

    const { getByText, queryByRole } = render();

    await waitFor(() => expect(queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(getByText('Request failed with status code 500')).toBeInTheDocument()
    );
  });

  it('should show the warning message with 2 draft relations and 2 entries even if the locale param is not passed', async () => {
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

    const { getByRole } = render();

    await waitFor(() => {
      const publishDialog = getByRole('dialog');
      expect(publishDialog).toBeInTheDocument();
      within(publishDialog).getByText(/2 relations out of 2 entries are/i);
    });
  });
});
