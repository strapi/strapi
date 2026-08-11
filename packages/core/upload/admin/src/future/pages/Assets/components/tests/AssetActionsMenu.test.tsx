import { render, screen, waitFor, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { AssetActionsMenu } from '../AssetActionsMenu';

import type { File } from '../../../../../../../shared/contracts/files';
import type { DragFileData } from '../../../../types/dnd';

const mockToggleNotification = jest.fn();
const mockCopy = jest.fn();
const mockClear = jest.fn();
const mockDownloadFile = jest.fn();
const mockAIAvailability = jest.fn(() => true);

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin/ee'),
  useAIAvailability: () => mockAIAvailability(),
}));

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

// `markBusy` returns the release function, so the spy has to hand back a second
// spy rather than a bare mock — the component calls it in a `finally`.
const releaseBusySpy = jest.fn();
const busySpy = jest.fn((_id: number, _message: string) => releaseBusySpy);

jest.mock('../../hooks/useBusyAssets', () => ({
  useBusyAssetsOptional: () => ({
    markBusy: (id: number, message: string) => busySpy(id, message),
    isBusy: () => false,
    getBusyMessage: () => null,
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
    mockAIAvailability.mockReturnValue(true);
  });

  // Radix's default `modal` menu marks the rest of the document `aria-hidden`
  // and swallows pointer events, so a click on a sibling row's trigger only
  // dismissed the open menu — every menu you touched then needed its own click
  // to close. Non-modal makes that one click close this and open that.
  it("closes an open menu when another row's menu is opened", async () => {
    const otherAsset = { ...asset, id: 6, name: 'other.png' } as File;
    const otherDragData: DragFileData = {
      kind: 'file',
      id: 6,
      name: 'other.png',
      folderId: null,
    };

    const { user } = render(
      <>
        <AssetActionsMenu asset={asset} dragData={dragData} />
        <AssetActionsMenu asset={otherAsset} dragData={otherDragData} />
      </>
    );

    const [firstTrigger, secondTrigger] = screen.getAllByRole('button', { name: 'More actions' });

    await user.click(firstTrigger);
    expect(screen.getAllByRole('menu')).toHaveLength(1);

    // The second trigger stays reachable: nothing outside the open menu is
    // `aria-hidden`, which is what made this click a no-op before.
    await user.click(secondTrigger);

    await waitFor(() => expect(screen.getAllByRole('menu')).toHaveLength(1));
    expect(secondTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(firstTrigger).toHaveAttribute('aria-expanded', 'false');
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

  // The design system caps Menu.Content at 15rem and hides the scrollbar. This
  // menu is taller than the space under a last-row trigger, so with the default
  // the popper clamped it and cut Delete off with nothing on screen to say so.
  // Capping to the height Radix measured lifts the clamp without giving up the
  // scroll fallback the DS default relied on — see ActionsMenuContent.
  it('caps the menu to the available height rather than the DS 15rem default', async () => {
    const { user } = setup();

    await openMenu(user);

    expect(screen.getByRole('menu')).toHaveStyle({
      maxHeight: 'min(var(--radix-popper-available-height, 100vh), 100vh)',
    });
  });

  // The cap is only half the fix: the menu also has to stay scrollable, so the
  // DS's `overflow: auto` must survive the override. (The matching
  // `scrollbar-width: thin` that un-hides the scrollbar can't be asserted here —
  // jsdom's computed style doesn't implement that property.)
  it('stays scrollable so overflow past the cap remains reachable', async () => {
    const { user } = setup();

    await openMenu(user);

    expect(screen.getByRole('menu')).toHaveStyle({ overflow: 'auto' });
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
          '*/upload/files/:id/replace',
          ({ params }) => {
            uploadedId = params.id as string;
            return HttpResponse.json({ id: 5, name: 'new.png' });
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

    // The menu is closed by the time the picker returns, so `disabled={isReplacing}`
    // has nothing left to disable. The row-level feedback is driven from here
    // via `BusyAssetsProvider` — the row/card render it, this only reports it.
    it('marks the asset busy for the duration of the replace', async () => {
      let releaseUpload: (() => void) | undefined;
      server.use(
        http.post(
          '*/upload/files/:id/replace',
          async () => {
            await new Promise<void>((resolve) => {
              releaseUpload = resolve;
            });
            return HttpResponse.json({ id: 5, name: 'new.png' });
          },
          { once: true }
        )
      );

      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Replace media' }));
      await user.click(await screen.findByRole('button', { name: 'Continue' }));

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, new globalThis.File(['x'], 'new.png', { type: 'image/png' }));

      // In flight: the message is published to the provider.
      await waitFor(() => expect(busySpy).toHaveBeenCalledWith(5, 'Replacing the file…'));
      expect(releaseBusySpy).not.toHaveBeenCalled();

      releaseUpload?.();

      // Settled: released, so the row goes back to its normal state.
      await waitFor(() => expect(releaseBusySpy).toHaveBeenCalled());
    });

    // A failed replace must not strand the row dimmed and inert forever.
    it('releases the busy flag when the replace fails', async () => {
      server.use(
        http.post(
          '*/upload/files/:id/replace',
          () => HttpResponse.json({ error: { message: 'Nope.' } }, { status: 500 }),
          {
            once: true,
          }
        )
      );

      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Replace media' }));
      await user.click(await screen.findByRole('button', { name: 'Continue' }));

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, new globalThis.File(['x'], 'new.png', { type: 'image/png' }));

      await waitFor(() => expect(releaseBusySpy).toHaveBeenCalled());
    });

    // The default settings handler enables AI metadata, so the paragraph is
    // gated purely on whether the provider can read this asset.
    it('promises regenerated AI metadata for a supported image', async () => {
      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Replace media' }));

      expect(
        await screen.findByText('AI will generate new metadata after upload.')
      ).toBeInTheDocument();
    });

    it.each([
      ['a PDF', 'application/pdf', '.pdf'],
      // A GIF clears the server's looser `image/*` replace gate but is not on
      // the provider allowlist, so it would be skipped after upload.
      ['a GIF', 'image/gif', '.gif'],
      // `File.mime` is optional on the contract. An asset without one has to
      // fail closed: it can't be shown to be on the provider allowlist, so
      // promising regenerated metadata would be describing something that may
      // never happen. Guards the ungated overload from being reached by
      // accident — see `useAIMetadataEnabled`.
      ['an asset with no mime', undefined, ''],
    ])('does not promise AI metadata for %s', async (_label, mime, ext) => {
      const { user } = setup({ asset: { ...asset, mime, ext } as unknown as File });

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Replace media' }));

      expect(await screen.findByText('Replace this media file?')).toBeInTheDocument();
      expect(screen.getByText('Current content will be permanently replaced.')).toBeInTheDocument();
      expect(
        screen.queryByText('AI will generate new metadata after upload.')
      ).not.toBeInTheDocument();
    });

    // `GET /upload/settings` returns the stored `aiMetadata` toggle regardless
    // of licensing, and it defaults to `true` — so without the EE availability
    // gate the dialog promised AI metadata on plans that never generate it.
    it('does not promise AI metadata when the license has no AI, despite the setting being on', async () => {
      mockAIAvailability.mockReturnValue(false);
      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Replace media' }));

      expect(await screen.findByText('Replace this media file?')).toBeInTheDocument();
      expect(
        screen.queryByText('AI will generate new metadata after upload.')
      ).not.toBeInTheDocument();
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
        http.post('*/upload/files/:id/replace', () =>
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
      // Replace is the whole top group here, so a separator would fence it off
      // from move/delete rather than divide the two groups.
      expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    });

    it('renders no trigger at all when every action is denied', async () => {
      renderWithout(
        'plugin::upload.assets.update',
        'plugin::upload.assets.copy-link',
        'plugin::upload.assets.download'
      );

      // `useRBAC` resolves asynchronously, so the trigger can only be assumed
      // gone once the permission check has settled.
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument()
      );
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });
});
