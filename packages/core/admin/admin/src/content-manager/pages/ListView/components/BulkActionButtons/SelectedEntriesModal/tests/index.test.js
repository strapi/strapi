import React from 'react';

import { Table, useQueryParams } from '@strapi/helper-plugin';
import { screen, waitForElementToBeRemoved, within, fireEvent } from '@testing-library/react';
import { render as renderRTL, waitFor, server } from '@tests/utils';
import { rest } from 'msw';

import SelectedEntriesModal from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // TODO: get rid of this mock and use `initialEntries` to provide the base query params.
  useQueryParams: jest.fn(() => [
    {
      query: {
        sort: 'name:DESC',
        plugins: {
          i18n: {
            locale: 'en',
          },
        },
      },
    },
  ]),
}));

const render = (props = { onToggle: jest.fn() }) =>
  renderRTL(
    <Table.Root defaultSelectedEntries={[1, 2, 3]} colCount={4}>
      <SelectedEntriesModal {...props} />
    </Table.Root>
  );

describe('Bulk publish selected entries modal', () => {
  it('renders the selected items in the modal', async () => {
    const { queryByText } = render();

    await waitForElementToBeRemoved(() => queryByText('Loading content'));

    expect(screen.getByText(/publish entries/i)).toBeInTheDocument();

    // Nested table should render the selected items from the parent table
    expect(screen.queryByText('Entry 1')).toBeInTheDocument();
    expect(screen.queryByText('Entry 4')).not.toBeInTheDocument();
  });

  it('renders the selected items in the modal even if the locale param is not passed', async () => {
    useQueryParams.mockImplementation(() => [
      {
        query: {
          page: 1,
          pageSize: 10,
          sort: 'name:DESC',
        },
      },
    ]);

    const { queryByText } = render();

    await waitForElementToBeRemoved(() => queryByText('Loading content'));

    expect(screen.getByText(/publish entries/i)).toBeInTheDocument();

    // Nested table should render the selected items from the parent table
    expect(screen.queryByText('Entry 1')).toBeInTheDocument();
    expect(screen.queryByText('Entry 4')).not.toBeInTheDocument();
  });

  it('reacts to selection updates', async () => {
    const { queryByText } = render();

    await waitForElementToBeRemoved(() => queryByText('Loading content'));

    // User can toggle selected entries in the modal
    const checkboxEntry1 = await screen.findByRole('checkbox', { name: 'Select 1' });
    const checkboxEntry2 = await screen.findByRole('checkbox', { name: 'Select 2' });
    const checkboxEntry3 = await screen.findByRole('checkbox', { name: 'Select 3' });

    // All table items should be selected by default
    expect(checkboxEntry1).toBeChecked();
    expect(checkboxEntry2).toBeChecked();
    expect(checkboxEntry3).toBeChecked();

    // User can unselect items
    fireEvent.click(checkboxEntry1);
    await waitFor(() => {
      expect(checkboxEntry1).not.toBeChecked();
    });

    fireEvent.click(checkboxEntry2);
    await waitFor(() => {
      expect(checkboxEntry2).not.toBeChecked();
    });

    fireEvent.click(checkboxEntry3);
    await waitFor(() => {
      expect(checkboxEntry3).not.toBeChecked();
    });

    // Publish button should be disabled if no items are selected
    const count = screen.getByText('entries ready to publish', { exact: false });
    expect(count).toHaveTextContent('0 entries ready to publish');
    const publishButton = screen.getByRole('button', { name: /publish/i });
    expect(publishButton).toBeDisabled();

    // If at least one item is selected, the publish button should work
    fireEvent.click(checkboxEntry1);
    await waitFor(() => {
      expect(count).toHaveTextContent('1 entry ready to publish');
      expect(publishButton).not.toBeDisabled();
    });
  });

  it('should publish valid entries after confirming and close the modal', async () => {
    const mockOnToggle = jest.fn();

    const { queryByText, user } = render({
      onToggle: mockOnToggle,
    });

    await waitForElementToBeRemoved(() => queryByText('Loading content'));

    const publishButton = await screen.findByRole('button', { name: /publish/i });
    await user.click(publishButton);
    const publishDialog = await screen.findByRole('dialog', { name: /confirmation?/i });
    const publishDialogButton = await within(publishDialog).findByRole('button', {
      name: /publish/i,
    });

    expect(publishDialog).toBeInTheDocument();
    expect(publishDialogButton).toBeInTheDocument();

    await user.click(publishDialogButton);

    await waitFor(() => {
      expect(publishDialog).not.toBeInTheDocument();
    });

    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it('should only keep entries with validation errors in the modal after publish', async () => {
    server.use(
      rest.get('*/content-manager/collection-types/:apiId', (req, res, ctx) => {
        return res(
          ctx.json({
            results: [
              {
                id: 1,
                name: 'Entry 1',
              },
              {
                id: 2,
                name: 'Entry 2',
              },
              {
                id: 3,
                name: '',
              },
            ],
          })
        );
      })
    );

    const { queryByText, user } = render();

    await waitForElementToBeRemoved(() => queryByText('Loading content'));

    const publishButton = await screen.findByRole('button', { name: /publish/i });
    await user.click(publishButton);
    const publishDialog = await screen.findByRole('dialog', { name: /confirmation?/i });
    const publishDialogButton = await within(publishDialog).findByRole('button', {
      name: /publish/i,
    });

    expect(publishDialog).toBeInTheDocument();
    expect(publishDialogButton).toBeInTheDocument();

    await user.click(publishDialogButton);

    expect(publishDialog).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('gridcell', { name: 'Entry 1' })).not.toBeInTheDocument();
      expect(screen.queryByRole('gridcell', { name: 'Entry 2' })).not.toBeInTheDocument();
      expect(screen.getByRole('gridcell', { name: '3' })).toBeInTheDocument();
      expect(
        screen.getByRole('gridcell', { name: 'components.Input.error.validation.required' })
      ).toBeInTheDocument();
    });

    await waitFor(() => expect(screen.getByText('Published')).toBeInTheDocument());
  }, 10000);

  it('should show validation errors if there is an error', async () => {
    server.use(
      rest.get('*/content-manager/collection-types/:apiId', (req, res, ctx) => {
        return res.once(
          ctx.json({
            results: [
              {
                id: 1,
                name: 'Entry 1',
              },
              {
                id: 2,
                name: 'Entry 2',
              },
              {
                id: 3,
                name: '',
              },
            ],
          })
        );
      })
    );

    const { queryByText } = render();

    await waitForElementToBeRemoved(() => queryByText('Loading content'));

    // Is showing the error message
    expect(
      await screen.findByRole('gridcell', { name: 'components.Input.error.validation.required' })
    ).toBeInTheDocument();

    // Publish button is enabled if at least one selected entry is valid
    const publishButton = await screen.findByRole('button', { name: /publish/i });
    expect(publishButton).not.toBeDisabled();
    // Publish button is disabled if all selected entries have errors
    const checkboxEntry1 = await screen.findByRole('checkbox', { name: 'Select 1' });
    fireEvent.click(checkboxEntry1);
    const checkboxEntry2 = await screen.findByRole('checkbox', { name: 'Select 2' });
    fireEvent.click(checkboxEntry2);
    await waitFor(() => {
      expect(publishButton).toBeDisabled();
    });
  });

  it('should show the correct messages above the table in the selected entries modal', async () => {
    server.use(
      rest.get('*/content-manager/collection-types/:apiId', (req, res, ctx) => {
        return res.once(
          ctx.json({
            results: [
              {
                id: 1,
                name: 'Entry 1',
                publishedAt: '2023-08-03T08:14:08.324Z',
              },
              {
                id: 2,
                name: 'Entry 2',
              },
              {
                id: 3,
                name: '',
              },
            ],
          })
        );
      })
    );

    const { queryByText } = render();

    await waitForElementToBeRemoved(() => queryByText('Loading content'));

    // Should show a message with the entries already published
    const countAlreadyPublished = await screen.findByText('entry already published', {
      exact: false,
    });

    expect(countAlreadyPublished).toHaveTextContent('1 entry already published');
    // Should show a message with the entries ready to be published
    const countReadyToBePublished = await screen.findByText('entry ready to publish', {
      exact: false,
    });

    expect(countReadyToBePublished).toHaveTextContent('1 entry ready to publish');
    // Should show a message with the entries with errors to fix
    const countWithErrors = await screen.findByText('entry waiting for action', {
      exact: false,
    });
    expect(countWithErrors).toHaveTextContent('1 entry waiting for action');
  });
});
