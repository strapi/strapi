import { render, screen, waitFor, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { BulkMoveDialog } from '../BulkMoveDialog';

import type { DragItemData } from '../../../../types/dnd';

const mockToggleNotification = jest.fn();

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useNotification: () => ({ toggleNotification: mockToggleNotification }),
}));

const folderStructure = [
  {
    id: 1,
    name: 'Marketing team',
    children: [{ id: 3, name: 'Logos', children: [] }],
  },
  { id: 2, name: 'Tech', children: [] },
];

const useFolderStructure = (structure: unknown = folderStructure) => {
  server.use(http.get('*/upload/folder-structure', () => HttpResponse.json({ data: structure })));
};

const setup = (items: DragItemData[], onSuccess = jest.fn()) => ({
  onSuccess,
  ...render(<BulkMoveDialog open onClose={jest.fn()} items={items} onSuccess={onSuccess} />),
});

describe('BulkMoveDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('derives the request payload from the items, not from the selection', async () => {
    useFolderStructure();
    let requestBody: unknown;
    server.use(
      http.post('*/upload/actions/bulk-move', async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ data: { files: [], folders: [] } });
      })
    );

    const { user } = setup([
      { kind: 'file', id: 11, name: 'a.png', folderId: null },
      { kind: 'file', id: 12, name: 'b.png', folderId: null },
      { kind: 'folder', id: 7, name: 'Photos', parentId: null },
    ]);

    await user.click(await screen.findByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Tech' }));
    await user.click(screen.getByRole('button', { name: 'Move' }));

    await waitFor(() =>
      expect(requestBody).toEqual({ fileIds: [11, 12], folderIds: [7], destinationFolderId: 2 })
    );
  });

  it('names the source from the item, not from the folder currently open', async () => {
    // A folder found through a global search lives somewhere else entirely; the
    // toast has to name that parent rather than whatever `?folder=` points at.
    useFolderStructure();
    server.use(
      http.get('*/upload/folders/1', () =>
        HttpResponse.json({ data: { id: 1, name: 'Marketing team', pathId: 1, path: '/1' } })
      ),
      http.post('*/upload/actions/bulk-move', () =>
        HttpResponse.json({ data: { files: [], folders: [] } })
      )
    );

    const { user } = setup([{ kind: 'folder', id: 7, name: 'Photos', parentId: 1 }]);

    await user.click(await screen.findByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Tech' }));
    await user.click(screen.getByRole('button', { name: 'Move' }));

    await waitFor(() =>
      expect(mockToggleNotification).toHaveBeenCalledWith({
        type: 'success',
        message: '1 element has been moved from Marketing team to Tech',
      })
    );
  });

  it('omits the source when the selection spans folders', async () => {
    // A selection built under a global search can hold items from anywhere.
    // Naming one of their folders would tell the user the whole set came from
    // there, so the wording drops the source instead.
    useFolderStructure();
    server.use(
      http.get('*/upload/folders/1', () =>
        HttpResponse.json({ data: { id: 1, name: 'Marketing team', pathId: 1, path: '/1' } })
      ),
      http.post('*/upload/actions/bulk-move', () =>
        HttpResponse.json({ data: { files: [], folders: [] } })
      )
    );

    const { user } = setup([
      { kind: 'file', id: 11, name: 'a.png', folderId: 1 },
      { kind: 'file', id: 12, name: 'b.png', folderId: 3 },
    ]);

    await user.click(await screen.findByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Tech' }));
    await user.click(screen.getByRole('button', { name: 'Move' }));

    await waitFor(() =>
      expect(mockToggleNotification).toHaveBeenCalledWith({
        type: 'success',
        message: '2 elements have been moved to Tech',
      })
    );
  });

  it('still names the root when the whole selection sits at the root', async () => {
    // Uniform source with a null id — a real, nameable location, not the
    // "no single source" case above.
    useFolderStructure();
    server.use(
      http.post('*/upload/actions/bulk-move', () =>
        HttpResponse.json({ data: { files: [], folders: [] } })
      )
    );

    const { user } = setup([
      { kind: 'file', id: 11, name: 'a.png', folderId: null },
      { kind: 'file', id: 12, name: 'b.png', folderId: null },
    ]);

    await user.click(await screen.findByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Tech' }));
    await user.click(screen.getByRole('button', { name: 'Move' }));

    await waitFor(() =>
      expect(mockToggleNotification).toHaveBeenCalledWith({
        type: 'success',
        message: '2 elements have been moved from Media Library to Tech',
      })
    );
  });

  it("prunes the moved folder's own subtree and its current parent from the destinations", async () => {
    useFolderStructure();

    const { user } = setup([{ kind: 'folder', id: 1, name: 'Marketing team', parentId: 2 }]);

    await user.click(await screen.findByRole('combobox'));

    // Itself (Marketing team) and its child (Logos) would be rejected by the
    // server; Tech is where it already lives, so it would be a no-op.
    expect(screen.queryByRole('option', { name: 'Marketing team' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Logos/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Tech' })).not.toBeInTheDocument();
    // Only the root is left, because the folder is currently nested.
    expect(screen.getByRole('option', { name: 'Media Library' })).toBeInTheDocument();
  });

  it('explains there is nowhere to move to, and disables Move, when no destination is valid', async () => {
    // A single root-level folder with no siblings: root is a no-op, and the
    // only other candidates are its own descendants.
    useFolderStructure([{ id: 1, name: 'Marketing team', children: [] }]);

    setup([{ kind: 'folder', id: 1, name: 'Marketing team', parentId: null }]);

    expect(
      await screen.findByText('There is no other folder to move this to.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();
  });

  it('shows the destination select while the folder structure is still loading', async () => {
    // The hint must not flash in before the options have had a chance to arrive.
    server.use(
      http.get('*/upload/folder-structure', async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });
        return HttpResponse.json({ data: folderStructure });
      })
    );

    setup([{ kind: 'folder', id: 1, name: 'Marketing team', parentId: null }]);

    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.queryByText('There is no other folder to move this to.')).not.toBeInTheDocument();
  });

  it('keeps Move disabled until the destinations exist', async () => {
    // A root-level item defaults to the root destination while the options are
    // empty — submitting then would post the no-op move that was filtered out.
    server.use(
      http.get('*/upload/folder-structure', async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });
        return HttpResponse.json({ data: folderStructure });
      })
    );

    setup([{ kind: 'file', id: 11, name: 'a.png', folderId: null }]);

    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Move' })).toBeEnabled());
  });

  it('reports a failed structure request as a load error, not as an empty destination list', async () => {
    server.use(
      http.get('*/upload/folder-structure', () => new HttpResponse(null, { status: 500 }))
    );

    setup([{ kind: 'folder', id: 1, name: 'Marketing team', parentId: null }]);

    expect(
      await screen.findByText("Couldn't load the folder list. Please try again.")
    ).toBeInTheDocument();
    expect(screen.queryByText('There is no other folder to move this to.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();
  });
});
