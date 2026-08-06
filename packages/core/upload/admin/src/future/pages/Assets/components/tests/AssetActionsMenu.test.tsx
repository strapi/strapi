import { render, screen, waitFor, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { AssetActionsMenu } from '../AssetActionsMenu';

import type { File } from '../../../../../../../shared/contracts/files';
import type { DragFileData } from '../../../../types/dnd';

const mockToggleNotification = jest.fn();
const mockCopy = jest.fn();
const mockClear = jest.fn();
const mockDownloadFile = jest.fn();

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useNotification: () => ({ toggleNotification: mockToggleNotification }),
  useClipboard: () => ({ copy: mockCopy }),
}));

jest.mock('../../hooks/useAssetSelection', () => ({
  useAssetSelection: () => ({
    clear: mockClear,
    selectedIds: new Set<number>([9, 10]),
    selectedFolderIds: new Set<number>([8]),
  }),
}));

jest.mock('../../../../utils/downloadFile', () => ({
  downloadFile: (...args: unknown[]) => mockDownloadFile(...args),
}));

const asset = {
  id: 5,
  name: 'photo.png',
  url: '/uploads/photo.png',
  mime: 'image/png',
  ext: '.png',
} as File;

// `folderId: null` keeps the asset at the root, so the move dialog offers the
// fixture folders rather than filtering its own parent out.
const dragData: DragFileData = { kind: 'file', id: 5, name: 'photo.png', folderId: null };

const setup = (props: Partial<React.ComponentProps<typeof AssetActionsMenu>> = {}) =>
  render(<AssetActionsMenu asset={asset} dragData={dragData} {...props} />);

const openMenu = async (user: ReturnType<typeof setup>['user']) => {
  await user.click(screen.getByRole('button', { name: 'More actions' }));
};

describe('AssetActionsMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCopy.mockResolvedValue(true);
    mockDownloadFile.mockResolvedValue(undefined);
  });

  it('renders a closed menu behind a "More actions" trigger', () => {
    setup();

    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });

  it('opens the menu with the five actions, separated before move/delete', async () => {
    const { user } = setup();

    await openMenu(user);

    const items = screen.getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'Replace media',
      'Copy link to media',
      'Download media',
      'Move to folder',
      'Delete',
    ]);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  describe('Copy link to media', () => {
    it('copies the asset URL and toasts', async () => {
      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Copy link to media' }));

      // Prefixed with the backend URL, so the link works pasted anywhere.
      expect(mockCopy).toHaveBeenCalledWith('http://localhost:1337/uploads/photo.png');
      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'success',
          message: 'Link copied.',
        })
      );
    });

    it('toasts a danger message when the clipboard write fails', async () => {
      mockCopy.mockResolvedValue(false);
      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Copy link to media' }));

      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'danger',
          message: 'Failed to copy the link.',
        })
      );
    });
  });

  describe('Download media', () => {
    it('downloads the asset under its own filename', async () => {
      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Download media' }));

      await waitFor(() =>
        expect(mockDownloadFile).toHaveBeenCalledWith(
          'http://localhost:1337/uploads/photo.png',
          'photo.png'
        )
      );
      expect(mockToggleNotification).not.toHaveBeenCalled();
    });

    it('toasts when the download fails', async () => {
      mockDownloadFile.mockRejectedValue(new Error('network'));
      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Download media' }));

      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'danger',
          message: 'Failed to download the file.',
        })
      );
    });
  });

  describe('Replace media', () => {
    it('warns before opening the file picker, and uploads the picked file against this asset', async () => {
      let uploadedId: string | null = null;
      server.use(
        http.post(
          '*/upload',
          ({ request }) => {
            uploadedId = new URL(request.url).searchParams.get('id');
            return HttpResponse.json([{ id: 5, name: 'new.png' }]);
          },
          { once: true }
        )
      );

      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Replace media' }));

      // The picker only opens after the warning is acknowledged.
      expect(await screen.findByText('Replace this media file?')).toBeInTheDocument();
      expect(screen.getByText('Current content will be permanently replaced.')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Continue' }));

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, new globalThis.File(['x'], 'new.png', { type: 'image/png' }));

      await waitFor(() => expect(uploadedId).toBe('5'));
      expect(mockToggleNotification).toHaveBeenCalledWith({
        type: 'success',
        message: 'File replaced.',
      });
    });

    it('closes the warning on cancel without touching the file input', async () => {
      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Replace media' }));
      expect(await screen.findByText('Replace this media file?')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() =>
        expect(screen.queryByText('Replace this media file?')).not.toBeInTheDocument()
      );
      expect(mockToggleNotification).not.toHaveBeenCalled();
    });

    it('surfaces the server message when the replace fails', async () => {
      server.use(
        http.post('*/upload', () =>
          HttpResponse.json({ error: { message: 'File too large' } }, { status: 413 })
        )
      );

      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Replace media' }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, new globalThis.File(['x'], 'new.png', { type: 'image/png' }));

      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'danger',
          message: 'File too large',
        })
      );
    });
  });

  describe('Move to folder', () => {
    it('moves only this asset, whatever else is selected, then clears the selection', async () => {
      let requestBody: unknown;
      server.use(
        http.post(
          '*/upload/actions/bulk-move',
          async ({ request }) => {
            requestBody = await request.json();
            return HttpResponse.json({ data: { files: [], folders: [] } });
          },
          { once: true }
        )
      );

      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Move to folder' }));

      expect(await screen.findByText('Move elements to')).toBeInTheDocument();

      await user.click(await screen.findByRole('combobox'));
      await user.click(await screen.findByRole('option', { name: 'test' }));
      await user.click(screen.getByRole('button', { name: 'Move' }));

      await waitFor(() =>
        // The menu never carries the selected assets (9, 10) or folder (8).
        expect(requestBody).toEqual({ fileIds: [5], folderIds: [], destinationFolderId: 1 })
      );
      expect(mockClear).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.queryByText('Move elements to')).not.toBeInTheDocument());
    });

    it('closes the modal on cancel without moving anything', async () => {
      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Move to folder' }));
      expect(await screen.findByText('Move elements to')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByText('Move elements to')).not.toBeInTheDocument();
      expect(mockClear).not.toHaveBeenCalled();
    });
  });

  describe('Delete', () => {
    it('deletes only this asset on confirm, toasts, and clears the selection', async () => {
      let requestBody: unknown;
      server.use(
        http.post(
          '*/upload/actions/bulk-delete',
          async ({ request }) => {
            requestBody = await request.json();
            return HttpResponse.json({ data: { files: [], folders: [] } });
          },
          { once: true }
        )
      );

      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

      // The shared dialog copy counts items, and a single asset is one item.
      expect(await screen.findByText('Delete 1 item?')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Confirm' }));

      await waitFor(() => expect(requestBody).toEqual({ fileIds: [5], folderIds: [] }));
      expect(mockToggleNotification).toHaveBeenCalledWith({
        type: 'success',
        message: '1 item has been deleted',
      });
      expect(mockClear).toHaveBeenCalledTimes(1);
    });

    it('closes the confirm on cancel without deleting anything', async () => {
      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
      expect(await screen.findByText('Delete 1 item?')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByText('Delete 1 item?')).not.toBeInTheDocument();
      expect(mockToggleNotification).not.toHaveBeenCalled();
      expect(mockClear).not.toHaveBeenCalled();
    });
  });

  describe('Permissions', () => {
    const renderWithout = (...actions: string[]) =>
      render(<AssetActionsMenu asset={asset} dragData={dragData} />, {
        providerOptions: {
          permissions: (defaults: Array<{ action: string }>) =>
            defaults.filter((permission) => !actions.includes(permission.action)),
        },
      });

    it('drops replace, move and delete without assets.update', async () => {
      const { user } = renderWithout('plugin::upload.assets.update');

      await openMenu(user);

      await waitFor(() =>
        expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
          'Copy link to media',
          'Download media',
        ])
      );
      // Nothing left to separate once the move/delete group is gone.
      expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    });

    it('drops copy link and download without their own permissions', async () => {
      const { user } = renderWithout(
        'plugin::upload.assets.copy-link',
        'plugin::upload.assets.download'
      );

      await openMenu(user);

      await waitFor(() =>
        expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
          'Replace media',
          'Move to folder',
          'Delete',
        ])
      );
    });
  });
});
