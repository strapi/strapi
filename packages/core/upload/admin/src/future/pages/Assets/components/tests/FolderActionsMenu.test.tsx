import { render, screen, waitFor, server, fireEvent } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { FolderActionsMenu } from '../FolderActionsMenu';

import type { Folder } from '../../../../../../../shared/contracts/folders';
import type { DragFolderData } from '../../../../types/dnd';

const mockToggleNotification = jest.fn();
const mockCopy = jest.fn();
const mockClear = jest.fn();

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

// Deliberately not one of the folders returned by the default
// `/upload/folder-structure` handler (test / 2022 / 2023), so the destination
// select has options to pick from.
const folder: Folder = { id: 5, name: 'Photos', pathId: 5, path: '/5', parent: null };
const dragData: DragFolderData = { kind: 'folder', id: 5, name: 'Photos', parentId: null };

const setup = (props: Partial<React.ComponentProps<typeof FolderActionsMenu>> = {}) =>
  render(<FolderActionsMenu folder={folder} dragData={dragData} {...props} />);

const openMenu = async (user: ReturnType<typeof setup>['user']) => {
  await user.click(screen.getByRole('button', { name: 'More actions' }));
};

describe('FolderActionsMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCopy.mockResolvedValue(true);
  });

  it('renders a closed menu behind a "More actions" trigger', () => {
    setup();

    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });

  // See AssetActionsMenu: Radix's default modal menu made a sibling trigger
  // unclickable, so closing several opened menus took one click each.
  it("closes an open menu when another row's menu is opened", async () => {
    const otherFolder: Folder = {
      id: 6,
      name: 'Videos',
      pathId: 6,
      path: '/6',
      parent: null,
    };
    const otherDragData: DragFolderData = {
      kind: 'folder',
      id: 6,
      name: 'Videos',
      parentId: null,
    };

    const { user } = render(
      <>
        <FolderActionsMenu folder={folder} dragData={dragData} />
        <FolderActionsMenu folder={otherFolder} dragData={otherDragData} />
      </>
    );

    const [firstTrigger, secondTrigger] = screen.getAllByRole('button', { name: 'More actions' });

    await user.click(firstTrigger);
    expect(screen.getAllByRole('menu')).toHaveLength(1);

    await user.click(secondTrigger);

    await waitFor(() => expect(screen.getAllByRole('menu')).toHaveLength(1));
    expect(secondTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(firstTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the menu with the four actions, separated after the copy link', async () => {
    const { user } = setup();

    await openMenu(user);

    const items = screen.getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'Copy link to folder',
      'Rename folder',
      'Move to folder',
      'Delete folder',
    ]);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  describe('Copy link to folder', () => {
    it('copies a folder deep-link built from the current location and toasts', async () => {
      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Copy link to folder' }));

      expect(mockCopy).toHaveBeenCalledWith(
        `${window.location.origin}${window.location.pathname}?folder=5`
      );
      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'success',
          message: 'Folder link copied.',
        })
      );
    });

    it('toasts a danger message when the clipboard write fails', async () => {
      mockCopy.mockResolvedValue(false);
      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Copy link to folder' }));

      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'danger',
          message: 'Failed to copy the folder link.',
        })
      );
    });
  });

  describe('Rename folder', () => {
    it('does not mount the dialog until the action is selected', async () => {
      const { user } = setup();

      await openMenu(user);

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('opens a dialog prefilled with the folder name', async () => {
      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Rename folder' }));

      expect(await screen.findByRole('textbox')).toHaveValue('Photos');
    });

    it('renames this folder, resending its existing parent so it does not move', async () => {
      let requestBody: unknown;
      server.use(
        http.put(
          '*/upload/folders/:id',
          async ({ request }) => {
            requestBody = await request.json();
            return HttpResponse.json({ data: { id: 5, name: 'Pictures' } });
          },
          { once: true }
        )
      );

      // A nested folder: dropping `parent` from the payload would silently move
      // it to the root, since the server reads the parent from the request body.
      const { user } = setup({ dragData: { ...dragData, parentId: 1 } });

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Rename folder' }));

      // The form is submitted with fireEvent: user-event's click does not run
      // jsdom's submit-button activation behaviour inside the modal's portal.
      fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'Pictures' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(requestBody).toEqual({ name: 'Pictures', parent: 1 }));
    });

    it('keeps the selection, unlike move and delete', async () => {
      server.use(
        http.put('*/upload/folders/:id', () =>
          HttpResponse.json({ data: { id: 5, name: 'Pictures' } })
        )
      );

      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Rename folder' }));

      fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'Pictures' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'success',
          message: 'Folder has been renamed',
        })
      );
      expect(mockClear).not.toHaveBeenCalled();
    });

    it('closes the dialog on cancel without renaming anything', async () => {
      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Rename folder' }));
      expect(await screen.findByRole('textbox')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
      expect(mockToggleNotification).not.toHaveBeenCalled();
    });
  });

  describe('Move to folder', () => {
    it('moves only this folder, whatever else is selected, then clears the selection', async () => {
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
        expect(requestBody).toEqual({ fileIds: [], folderIds: [5], destinationFolderId: 1 })
      );
      expect(mockClear).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.queryByText('Move elements to')).not.toBeInTheDocument());
    });

    it('offers the Media Library for a nested folder and moves it to the root', async () => {
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

      // `parentId` is only trustworthy because the folders list query populates
      // `parent`; without it every row looks like it already lives at the root
      // and the root destination is hidden as a no-op.
      const { user } = setup({ dragData: { ...dragData, parentId: 1 } });

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Move to folder' }));

      await user.click(await screen.findByRole('combobox'));
      await user.click(await screen.findByRole('option', { name: 'Media Library' }));
      await user.click(screen.getByRole('button', { name: 'Move' }));

      await waitFor(() =>
        expect(requestBody).toEqual({ fileIds: [], folderIds: [5], destinationFolderId: null })
      );
    });

    it("leaves out the folder's current parent, which would be a no-op", async () => {
      const { user } = setup({ dragData: { ...dragData, parentId: 1 } });

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Move to folder' }));
      await user.click(await screen.findByRole('combobox'));

      // Folder 1 ("test") is where it already sits; its children are still valid.
      expect(screen.queryByRole('option', { name: 'test' })).not.toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'test / 2022' })).toBeInTheDocument();
    });

    it('pre-selects a real folder for a root-level folder, which cannot move to the root', async () => {
      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Move to folder' }));

      // The root is a no-op here, so it is not offered — and the select must
      // fall back to the first real destination rather than render blank.
      const select = await screen.findByRole('combobox');
      await waitFor(() => expect(select).toHaveTextContent('test'));

      await user.click(select);
      expect(screen.queryByRole('option', { name: 'Media Library' })).not.toBeInTheDocument();
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

  describe('Delete folder', () => {
    it('deletes only this folder on confirm, toasts, and clears the selection', async () => {
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
      await user.click(screen.getByRole('menuitem', { name: 'Delete folder' }));

      // The shared dialog copy counts items, and a single folder is one item.
      expect(await screen.findByText('Delete 1 item?')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Confirm' }));

      await waitFor(() => expect(requestBody).toEqual({ fileIds: [], folderIds: [5] }));
      expect(mockToggleNotification).toHaveBeenCalledWith({
        type: 'success',
        message: '1 item has been deleted',
      });
      expect(mockClear).toHaveBeenCalledTimes(1);
    });

    it('closes the confirm on cancel without deleting anything', async () => {
      const { user } = setup();

      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Delete folder' }));
      expect(await screen.findByText('Delete 1 item?')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByText('Delete 1 item?')).not.toBeInTheDocument();
      expect(mockToggleNotification).not.toHaveBeenCalled();
      expect(mockClear).not.toHaveBeenCalled();
    });
  });
});
