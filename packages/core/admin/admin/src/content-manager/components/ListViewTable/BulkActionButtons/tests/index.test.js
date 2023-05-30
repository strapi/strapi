import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { Table, useTableContext } from '@strapi/helper-plugin';

import { IntlProvider } from 'react-intl';
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

jest.mock('react-redux', () => ({
  useSelector: () => ({
    data: [
      { id: 1, publishedAt: null },
      { id: 2, publishedAt: '2023-01-01T10:10:10.408Z' },
    ],
  }),
}));

jest.mock('../../../../../shared/hooks', () => ({
  ...jest.requireActual('../../../../../shared/hooks'),
  useInjectionZone: () => [],
}));

const user = userEvent.setup();

const setup = (props) =>
  render(
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <Table.Root>
          <BulkActionButtons {...props} />
        </Table.Root>
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

    await userEvent.click(screen.getByRole('button', { name: /\bDelete\b/ }));

    expect(screen.getByText('Confirmation')).toBeInTheDocument();
  });

  it('should call confirm delete all if confirmation button is clicked', async () => {
    const mockConfirmDeleteAll = jest.fn();

    setup({
      showDelete: true,
      onConfirmDeleteAll: mockConfirmDeleteAll,
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /\bDelete\b/ }));
      await user.click(screen.getByRole('button', { name: /confirm/i }));
    });

    expect(mockConfirmDeleteAll).toHaveBeenCalledWith([1, 2]);
  });

  it('should not show publish button if selected entries are all published', async () => {
    useTableContext.mockReturnValueOnce({ selectedEntries: [2] });
    setup({ showPublish: true });

    waitFor(() => {
      expect(screen.getByRole('button', { name: /\bPublish\b/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /\bUnpublish\b/ })).toBeInTheDocument();
    });
  });

  it('should not show unpublish button if selected entries are all unpublished', () => {
    useTableContext.mockReturnValueOnce({ selectedEntries: [1] });
    setup({ showPublish: true });

    waitFor(() => {
      expect(screen.getByRole('button', { name: /\bPublish\b/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /\bUnpublish\b/ })).not.toBeInTheDocument();
    });
  });

  it('should show publish modal if publish button is clicked', async () => {
    const onConfirmPublishAll = jest.fn();
    setup({ showPublish: true, onConfirmPublishAll });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /\bpublish\b/i }));
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: /\bpublish\b/i })
      );
    });

    expect(onConfirmPublishAll).toHaveBeenCalledWith([1, 2]);
  });

  it('should show unpublish modal if unpublish button is clicked', async () => {
    const onConfirmUnpublishAll = jest.fn();
    setup({ showPublish: true, onConfirmUnpublishAll });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /\bunpublish\b/i }));
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: /\bunpublish\b/i })
      );
    });

    expect(onConfirmUnpublishAll).toHaveBeenCalledWith([1, 2]);
  });
});
