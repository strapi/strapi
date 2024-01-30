import { useTableContext } from '@strapi/helper-plugin';
import { within } from '@testing-library/react';
import { render, screen } from '@tests/utils';

import { BulkActionButtons } from '../Buttons';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useTableContext: jest.fn(() => ({
    selectedEntries: [1, 2],
    setSelectedEntries: jest.fn(),
  })),
}));

jest.mock('../../../../../../hooks/useInjectionZone');
jest.mock('../SelectedEntriesModal', () => ({
  SelectedEntriesModal: () => <div>SelectedEntriesModal</div>,
}));

const DEFAULT_DATA = [
  { id: 1, publishedAt: null },
  { id: 2, publishedAt: '2023-01-01T10:10:10.408Z' },
];

describe('BulkActionsBar', () => {
  it('should render publish buttons if showPublish is true', async () => {
    render(
      <BulkActionButtons
        data={DEFAULT_DATA}
        refetchData={jest.fn()}
        onConfirmDeleteAll={jest.fn()}
        onConfirmUnpublishAll={jest.fn()}
        showPublish
      />
    );

    expect(screen.getByRole('button', { name: /\bPublish\b/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\bUnpublish\b/ })).toBeInTheDocument();
  });

  it('should not render publish buttons if showPublish is false', () => {
    render(
      <BulkActionButtons
        data={DEFAULT_DATA}
        refetchData={jest.fn()}
        onConfirmDeleteAll={jest.fn()}
        onConfirmUnpublishAll={jest.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /\bPublish\b/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\bUnpublish\b/ })).not.toBeInTheDocument();
  });

  it('should render delete button if showDelete is true', () => {
    render(
      <BulkActionButtons
        data={DEFAULT_DATA}
        refetchData={jest.fn()}
        onConfirmDeleteAll={jest.fn()}
        onConfirmUnpublishAll={jest.fn()}
        showDelete
      />
    );

    expect(screen.getByRole('button', { name: /\bDelete\b/ })).toBeInTheDocument();
  });

  it('should not render delete button if showDelete is false', () => {
    render(
      <BulkActionButtons
        data={DEFAULT_DATA}
        refetchData={jest.fn()}
        onConfirmDeleteAll={jest.fn()}
        onConfirmUnpublishAll={jest.fn()}
        showPublish
      />
    );

    expect(screen.queryByRole('button', { name: /\bDelete\b/ })).not.toBeInTheDocument();
  });

  it('should show delete modal if delete button is clicked', async () => {
    const { user } = render(
      <BulkActionButtons
        data={DEFAULT_DATA}
        refetchData={jest.fn()}
        onConfirmDeleteAll={jest.fn()}
        onConfirmUnpublishAll={jest.fn()}
        showDelete
      />
    );

    await user.click(screen.getByRole('button', { name: /\bDelete\b/ }));

    expect(screen.getByText('Confirmation')).toBeInTheDocument();
  });

  it('should call confirm delete all if confirmation button is clicked', async () => {
    const mockConfirmDeleteAll = jest.fn();

    const { user } = render(
      <BulkActionButtons
        data={DEFAULT_DATA}
        refetchData={jest.fn()}
        onConfirmUnpublishAll={jest.fn()}
        onConfirmDeleteAll={mockConfirmDeleteAll}
        showDelete
      />
    );

    await user.click(screen.getByRole('button', { name: /\bDelete\b/ }));

    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(mockConfirmDeleteAll).toHaveBeenCalledWith([1, 2]);
  });

  it('should not show publish button if selected entries are all published', () => {
    //@ts-expect-error – mocking
    useTableContext.mockReturnValueOnce({ selectedEntries: [2] });

    render(
      <BulkActionButtons
        data={DEFAULT_DATA}
        refetchData={jest.fn()}
        onConfirmDeleteAll={jest.fn()}
        onConfirmUnpublishAll={jest.fn()}
        showPublish
      />
    );

    expect(screen.queryByRole('button', { name: /\bPublish\b/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\bUnpublish\b/ })).toBeInTheDocument();
  });

  it('should not show unpublish button if selected entries are all unpublished', () => {
    //@ts-expect-error – mocking
    useTableContext.mockReturnValueOnce({ selectedEntries: [1] });
    render(
      <BulkActionButtons
        data={DEFAULT_DATA}
        refetchData={jest.fn()}
        onConfirmDeleteAll={jest.fn()}
        onConfirmUnpublishAll={jest.fn()}
        showPublish
      />
    );

    expect(screen.getByRole('button', { name: /\bPublish\b/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\bUnpublish\b/ })).not.toBeInTheDocument();
  });

  it('should show publish modal if publish button is clicked', async () => {
    const { user } = render(
      <BulkActionButtons
        data={DEFAULT_DATA}
        refetchData={jest.fn()}
        onConfirmDeleteAll={jest.fn()}
        onConfirmUnpublishAll={jest.fn()}
        showPublish
      />
    );

    await user.click(screen.getByRole('button', { name: /\bpublish\b/i }));

    // Only test that a mock component is rendered. The modal is tested in its own file.
    expect(screen.getByText('SelectedEntriesModal')).toBeInTheDocument();
  });

  it('should show unpublish modal if unpublish button is clicked', async () => {
    const onConfirmUnpublishAll = jest.fn();

    const { user } = render(
      <BulkActionButtons
        data={DEFAULT_DATA}
        refetchData={jest.fn()}
        onConfirmDeleteAll={jest.fn()}
        showPublish
        onConfirmUnpublishAll={onConfirmUnpublishAll}
      />
    );

    await user.click(screen.getByRole('button', { name: /\bunpublish\b/i }));

    await screen.findByRole('dialog');

    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /\bunpublish\b/i })
    );

    expect(onConfirmUnpublishAll).toHaveBeenCalledWith([1, 2]);
  });
});
