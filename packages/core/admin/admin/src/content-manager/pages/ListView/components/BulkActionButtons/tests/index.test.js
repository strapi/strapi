import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { Table, useTableContext } from '@strapi/helper-plugin';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { combineReducers, createStore } from 'redux';

import BulkActionButtons from '..';
import reducers from '../../../../../../reducers';

const toggleNotification = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useTableContext: jest.fn(() => ({
    selectedEntries: [1, 2],
    setSelectedEntries: jest.fn(),
  })),
  useNotification: jest.fn(() => {
    return toggleNotification;
  }),
}));

jest.mock('../../../../../../shared/hooks', () => ({
  ...jest.requireActual('../../../../../../shared/hooks'),
  useInjectionZone: () => [],
}));

jest.mock('../SelectedEntriesModal', () => () => <div>SelectedEntriesModal</div>);

const user = userEvent.setup();

const rootReducer = combineReducers(reducers);
const store = createStore(rootReducer, {
  'content-manager_listView': {
    data: [
      { id: 1, publishedAt: null },
      { id: 2, publishedAt: '2023-01-01T10:10:10.408Z' },
    ],
    contentType: {
      settings: {
        mainField: 'name',
      },
    },
  },
});

const setup = (props) => ({
  ...render(<BulkActionButtons {...props} />, {
    wrapper({ children }) {
      return (
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en" messages={{}} defaultLocale="en">
            <Provider store={store}>
              <MemoryRouter>
                <Table.Root>{children}</Table.Root>
              </MemoryRouter>
            </Provider>
          </IntlProvider>
        </ThemeProvider>
      );
    },
  }),
});

describe('BulkActionsBar', () => {
  it('should render publish buttons if showPublish is true', async () => {
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

  it('should show publish modal if publish button is clicked', async () => {
    const onConfirmPublishAll = jest.fn();
    setup({ showPublish: true, onConfirmPublishAll });

    await user.click(screen.getByRole('button', { name: /\bpublish\b/i }));

    // Only test that a mock component is rendered. The modal is tested in its own file.
    expect(screen.getByText('SelectedEntriesModal')).toBeInTheDocument();
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
