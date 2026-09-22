import { render, screen, waitFor, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { DeleteItemsDialog } from '../DeleteItemsDialog';

const mockToggleNotification = jest.fn();

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useNotification: () => ({ toggleNotification: mockToggleNotification }),
}));

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  target: { fileIds: [1, 2], folderIds: [3] },
};

const setup = (props: Partial<React.ComponentProps<typeof DeleteItemsDialog>> = {}) =>
  render(<DeleteItemsDialog {...defaultProps} {...props} />);

describe('DeleteItemsDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('counts assets and folders together in the title', () => {
    setup();

    expect(screen.getByText('Delete 3 items?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    setup({ open: false });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('deletes the target on confirm, then closes, toasts and reports success', async () => {
    let requestBody: unknown;
    server.use(
      http.post('*/upload/actions/bulk-delete', async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ data: { files: [], folders: [] } });
      })
    );

    const onClose = jest.fn();
    const onSuccess = jest.fn();
    const { user } = setup({ onClose, onSuccess });

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(requestBody).toEqual({ fileIds: [1, 2], folderIds: [3] }));
    expect(mockToggleNotification).toHaveBeenCalledWith({
      type: 'success',
      message: '3 items have been deleted',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('stays open on error so the user can retry, and does not report success', async () => {
    server.use(
      http.post('*/upload/actions/bulk-delete', () =>
        HttpResponse.json({ error: { message: 'boom' } }, { status: 500 })
      )
    );

    const onClose = jest.fn();
    const onSuccess = jest.fn();
    const { user } = setup({ onClose, onSuccess });

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() =>
      expect(mockToggleNotification).toHaveBeenCalledWith({
        type: 'danger',
        message: 'An error occurred while deleting the items.',
      })
    );
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('stays open while the request is in flight, and reports the pending state', async () => {
    let resolveRequest: () => void;
    const requestReceived = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    server.use(
      http.post('*/upload/actions/bulk-delete', async () => {
        await requestReceived;
        return HttpResponse.json({ data: { files: [], folders: [] } });
      })
    );

    const onClose = jest.fn();
    const onPendingChange = jest.fn();
    const { user } = setup({ onClose, onPendingChange });

    expect(onPendingChange).toHaveBeenLastCalledWith(false);

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    // A bulk delete can't be aborted halfway, so neither Cancel nor the Radix
    // default close-on-action may take the dialog away mid-flight.
    await waitFor(() => expect(onPendingChange).toHaveBeenLastCalledWith(true));
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();

    resolveRequest!();

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onPendingChange).toHaveBeenLastCalledWith(false);
  });
});
