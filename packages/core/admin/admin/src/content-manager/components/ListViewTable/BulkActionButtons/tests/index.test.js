import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { Table, useTableContext } from '@strapi/helper-plugin';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { Router } from 'react-router-dom';

import BulkActionButtons from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useTracking: () => ({
    trackUsage: jest.fn(),
  }),
  useTableContext: jest.fn(() => ({
    selectedEntries: [1, 2],
    setSelectedEntries: jest.fn(),
  })),
}));

// TODO: add layout somewhere
jest.mock('react-redux', () => ({
  useSelector() {
    return {
      data: [
        { id: 1, publishedAt: null },
        { id: 2, publishedAt: '2023-01-01T10:10:10.408Z' },
      ],
      contentType: {
        settings: {
          mainField: 'name',
        },
      },
    };
  },
}));

jest.mock('../../../../../shared/hooks', () => ({
  ...jest.requireActual('../../../../../shared/hooks'),
  useInjectionZone: () => [],
}));

const user = userEvent.setup();
const history = createMemoryHistory();

useTableContext();

<Table.Root rows={myMockData}>
  <Table.Root>
  <MyComonentToTest />
  </Table.Root>
</Table.Root>

<ContextProvider data={}>
  <Component />
</ContextProvider>

const setup = (props) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <Router history={history}>
          <Table.Root>
            <BulkActionButtons {...props} />
          </Table.Root>
        </Router>
      </IntlProvider>
    </ThemeProvider>
  );

describe('BulkActionsBar', () => {
  it('should render publish buttons if showPublish is true', () => {
    setup({ showPublish: true });

    expect(screen.getByRole('button', { name: /\bPublish\b/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\bUnpublish\b/ })).toBeInTheDocument();
  });

  it('should not render publish buttons if showPublish is false', () => {
    setup({ showPublish: false });

    expect(screen.queryByRole('button', { name: /\bPublish\b/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\bUnpublish\b/ })).not.toBeInTheDocument();
  });

  it('should render delete button if showDelete is true', () => {
    setup({ showDelete: true });

    expect(screen.getByRole('button', { name: /\bDelete\b/ })).toBeInTheDocument();
  });

  it('should not render delete button if showDelete is false', () => {
    setup({ showDelete: false });

    expect(screen.queryByRole('button', { name: /\bDelete\b/ })).not.toBeInTheDocument();
  });

  it('should show delete modal if delete button is clicked', async () => {
    setup({ showDelete: true });

    await user.click(screen.getByRole('button', { name: /\bDelete\b/ }));

    expect(screen.getByText('Confirmation')).toBeInTheDocument();
  });

  it('should call confirm delete all if confirmation button is clicked', async () => {
    const mockConfirmDeleteAll = jest.fn();

    setup({
      showDelete: true,
      onConfirmDeleteAll: mockConfirmDeleteAll,
    });

    await user.click(screen.getByRole('button', { name: /\bDelete\b/ }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(mockConfirmDeleteAll).toHaveBeenCalledWith([1, 2]);
  });

  it('should not show publish button if selected entries are all published', () => {
    useTableContext.mockReturnValueOnce({ selectedEntries: [2] });
    setup({ showPublish: true });

    expect(screen.queryByRole('button', { name: /\bPublish\b/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\bUnpublish\b/ })).toBeInTheDocument();
  });

  it('should not show unpublish button if selected entries are all unpublished', () => {
    useTableContext.mockReturnValueOnce({ selectedEntries: [1] });
    setup({ showPublish: true });

    expect(screen.queryByRole('button', { name: /\bPublish\b/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\bUnpublish\b/ })).not.toBeInTheDocument();
  });

  it.only('should show selected entries modal if publish button is clicked', async () => {
    useTableContext.mockReturnValue({
      selectedEntries: [1, 2, 3],
      setSelectedEntries: jest.fn(),
      rows: [
        { id: 1, name: 'Row 1' },
        { id: 2, name: 'Row 2' },
        { id: 3, name: 'Row 3' },
      ],
    });

    const onConfirmPublishAll = jest.fn();
    setup({ showPublish: true, onConfirmPublishAll });

    // Trigger bulk publish modal
    await user.click(screen.getByRole('button', { name: /\bpublish\b/i }));
    await waitFor(() => expect(screen.getByText('Publish entries')).toBeInTheDocument());

    // Items should be listed in modal
    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.getByText('Row 2')).toBeInTheDocument();
    expect(screen.getByText('Row 3')).toBeInTheDocument();

    // Only selected items should be checked
    expect(screen.getByRole('checkbox', { name: 'Select 1' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select 3' })).toBeChecked();

    // When clicking publish on the modal, the confirmation dialog should appear
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /\bpublish\b/i })
    );
    const confirmationDialog = screen.getByRole('dialog', { name: 'Confirmation' });
    await user.click(within(confirmationDialog).getByRole('button', { name: /\bpublish\b/i }));
    expect(onConfirmPublishAll).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('should show publish modal if publish button is clicked', async () => {
    const onConfirmPublishAll = jest.fn();
    setup({ showPublish: true, onConfirmPublishAll });

    await user.click(screen.getByRole('button', { name: /\bpublish\b/i }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /\bpublish\b/i })
    );

    expect(onConfirmPublishAll).toHaveBeenCalledWith([1, 2]);
  });

  it('should show unpublish modal if unpublish button is clicked', async () => {
    const onConfirmUnpublishAll = jest.fn();
    setup({ showPublish: true, onConfirmUnpublishAll });

    await user.click(screen.getByRole('button', { name: /\bunpublish\b/i }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /\bunpublish\b/i })
    );

    expect(onConfirmUnpublishAll).toHaveBeenCalledWith([1, 2]);
  });
});
