import { userEvent } from '@testing-library/user-event';
import { act, fireEvent, render, screen, waitFor, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { AssetsTable } from '../components/AssetsTable';
import { BulkActionsBar } from '../components/BulkActionsBar';
import { AssetSelectionProvider } from '../hooks/useAssetSelection';

import type { File } from '../../../../../../shared/contracts/files';
import type { Folder } from '../../../../../../shared/contracts/folders';

const mockNavigateToFolder = jest.fn();
const mockOnAssetItemClick = jest.fn();
const mockToggleNotification = jest.fn();
const mockUseAIAvailability = jest.fn(() => ({ status: 'success' as const, isEnabled: true }));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useNotification: () => ({ toggleNotification: mockToggleNotification }),
}));

jest.mock('../../../../hooks/useAiAvailability', () => ({
  useAIAvailability: () => mockUseAIAvailability(),
}));

jest.mock('../hooks/useFolderNavigation', () => ({
  useFolderNavigation: () => ({
    currentFolderId: null,
    navigateToFolder: mockNavigateToFolder,
  }),
}));

jest.mock('../components/Dnd/useAssetDnd', () => ({
  useFileDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    isDragging: false,
  }),
  useFolderDraggableDroppable: (folder: { id: number; name: string }) => ({
    dragData: { kind: 'folder', id: folder.id, name: folder.name, parentId: null },
    draggable: {
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      isDragging: false,
    },
    droppable: { setNodeRef: jest.fn() },
    showValidDropHighlight: false,
    showInvalidDropCursor: false,
  }),
}));

const createMockAsset = (id: number, name: string, mime = 'image/png', ext = '.png'): File => ({
  id,
  name,
  hash: `hash_${id}`,
  alternativeText: `Alt text for ${name}`,
  ext,
  mime,
  url: `http://example.com/${name}`,
  formats: { thumbnail: { url: `http://example.com/thumb_${name}` } },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

const createMockFolder = (id: number, name: string): Folder => ({
  id,
  name,
  pathId: id,
  path: `/${id}`,
  parent: null,
});

const mockAssets: File[] = [
  createMockAsset(1, 'image1.png'),
  createMockAsset(2, 'image2.png'),
  createMockAsset(3, 'image3.png'),
];

interface SetupProps {
  assets?: File[];
  folders?: Folder[];
}

const setup = ({ assets = mockAssets, folders }: SetupProps = {}) =>
  render(
    <>
      <AssetsTable assets={assets} folders={folders} onAssetItemClick={mockOnAssetItemClick} />
      <BulkActionsBar assets={assets} />
    </>,
    { renderOptions: { wrapper: AssetSelectionProvider } }
  );

describe('AssetsTable', () => {
  beforeAll(() => {
    // Render in desktop mode so the checkbox column is present (useIsMobile reads
    // matchMedia, which jsdom otherwise reports as not-matching → mobile).
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAIAvailability.mockReturnValue({ status: 'success', isEnabled: true });
  });

  describe('Table rendering', () => {
    it('renders a table element', () => {
      setup();
      expect(screen.getByRole('gridcell', { name: 'name' })).toBeInTheDocument();
    });

    it('renders asset names in the table', () => {
      setup();
      expect(screen.getByText('image1.png')).toBeInTheDocument();
      expect(screen.getByText('image2.png')).toBeInTheDocument();
      expect(screen.getByText('image3.png')).toBeInTheDocument();
    });
  });

  describe('AssetPreviewCell', () => {
    describe('Image assets', () => {
      it('renders row for image/jpeg', () => {
        setup({ assets: [createMockAsset(1, 'test.jpg', 'image/jpeg', '.jpg')] });
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      it('renders row for image/png', () => {
        setup({ assets: [createMockAsset(1, 'test.png', 'image/png', '.png')] });
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });
    });

    describe('Video assets', () => {
      it('renders row for video/mp4', () => {
        setup({
          assets: [createMockAsset(1, 'video.mp4', 'video/mp4', '.mp4')],
        });
        expect(screen.getByText('video.mp4')).toBeInTheDocument();
      });

      it('renders row for video/webm', () => {
        setup({
          assets: [createMockAsset(1, 'video.webm', 'video/webm', '.webm')],
        });
        expect(screen.getByText('video.webm')).toBeInTheDocument();
      });
    });

    describe('Audio assets', () => {
      it('renders row for audio/mp3', () => {
        setup({
          assets: [createMockAsset(1, 'audio.mp3', 'audio/mp3', '.mp3')],
        });
        expect(screen.getByText('audio.mp3')).toBeInTheDocument();
      });

      it('renders row for audio/wav', () => {
        setup({
          assets: [createMockAsset(1, 'audio.wav', 'audio/wav', '.wav')],
        });
        expect(screen.getByText('audio.wav')).toBeInTheDocument();
      });
    });

    describe('Document assets', () => {
      it('renders row for application/pdf', () => {
        setup({
          assets: [createMockAsset(1, 'doc.pdf', 'application/pdf', '.pdf')],
        });
        expect(screen.getByText('doc.pdf')).toBeInTheDocument();
      });

      it('renders row for text/csv', () => {
        setup({
          assets: [createMockAsset(1, 'data.csv', 'text/csv', '.csv')],
        });
        expect(screen.getByText('data.csv')).toBeInTheDocument();
      });

      it('renders row for Excel files', () => {
        setup({
          assets: [createMockAsset(1, 'spreadsheet.xls', 'application/vnd.ms-excel', '.xls')],
        });
        expect(screen.getByText('spreadsheet.xls')).toBeInTheDocument();
      });

      it('renders row for zip files', () => {
        setup({
          assets: [createMockAsset(1, 'archive.zip', 'application/zip', '.zip')],
        });
        expect(screen.getByText('archive.zip')).toBeInTheDocument();
      });

      it('renders row for unknown document types', () => {
        setup({
          assets: [createMockAsset(1, 'file.bin', 'application/octet-stream', '.bin')],
        });
        expect(screen.getByText('file.bin')).toBeInTheDocument();
      });

      it('renders row when ext is undefined', () => {
        const asset = createMockAsset(1, 'file.bin', 'application/octet-stream', '.bin');
        asset.ext = undefined;
        setup({ assets: [asset] });
        expect(screen.getByText('file.bin')).toBeInTheDocument();
      });
    });

    describe('Edge cases', () => {
      it('handles missing mime type', () => {
        const asset = createMockAsset(1, 'file.txt', '', '.txt');
        asset.mime = undefined;
        setup({ assets: [asset] });
        expect(screen.getByText('file.txt')).toBeInTheDocument();
      });
    });
  });

  describe('Folder rows', () => {
    it('renders folder rows above asset rows', () => {
      const folders = [createMockFolder(1, 'Photos'), createMockFolder(2, 'Documents')];
      setup({ folders, assets: mockAssets });

      expect(screen.getByText('Photos')).toBeInTheDocument();
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('image1.png')).toBeInTheDocument();
    });

    it('calls navigateToFolder when a folder row is clicked', async () => {
      const user = userEvent.setup();
      const folders = [createMockFolder(1, 'Photos')];
      setup({ folders, assets: [] });

      await user.click(screen.getByText('Photos'));

      expect(mockNavigateToFolder).toHaveBeenCalledTimes(1);
      expect(mockNavigateToFolder).toHaveBeenCalledWith(folders[0]);
    });

    it('renders nothing when no folders and no assets (empty state is owned by the page)', () => {
      setup({ folders: [], assets: [] });
      expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    });

    it('renders only folder rows when there are no assets', () => {
      const folders = [createMockFolder(1, 'Photos')];
      setup({ folders, assets: [] });

      expect(screen.getByText('Photos')).toBeInTheDocument();
    });

    it('opens the folder actions menu without navigating into the folder', async () => {
      const { user } = setup({ folders: [createMockFolder(1, 'Photos')], assets: [] });

      await user.click(screen.getByRole('button', { name: 'More actions' }));

      expect(screen.getByRole('menuitem', { name: 'Copy link to folder' })).toBeInTheDocument();
      expect(mockNavigateToFolder).not.toHaveBeenCalled();
    });

    it('does not navigate into the folder when Enter is pressed on the actions menu', () => {
      setup({ folders: [createMockFolder(1, 'Photos')], assets: [] });

      // The row handles Enter as "open this folder", so the actions cell has to
      // swallow the keydown as well as the click. Dispatched directly rather
      // than through a real key press: the DS grid cell moves focus around on
      // its own, which jsdom doesn't reproduce faithfully.
      fireEvent.keyDown(screen.getByRole('button', { name: 'More actions' }), { key: 'Enter' });

      expect(mockNavigateToFolder).not.toHaveBeenCalled();
    });
  });

  // The dialogs the actions menu opens are portaled to the body but are React
  // children of the row, so the row's handlers see their events. The shield the
  // actions cell puts up must therefore be scoped to its own DOM subtree —
  // `stopPropagation` would kill the native event before it reaches `document`,
  // where Radix listens in order to dismiss its layers.
  describe('Folder actions menu dismissal', () => {
    // Folder 5 sits outside the default `/upload/folder-structure` fixture, so
    // the move dialog has somewhere to offer moving it to.
    const setupFolderRow = () => setup({ folders: [createMockFolder(5, 'Photos')], assets: [] });

    const openMoveDialog = async (user: ReturnType<typeof setup>['user']) => {
      await user.click(screen.getByRole('button', { name: 'More actions' }));
      await user.click(screen.getByRole('menuitem', { name: 'Move to folder' }));
      expect(await screen.findByText('Move elements to')).toBeInTheDocument();
    };

    // `disableOutsidePointerEvents` puts `pointer-events: none` on the body, so
    // user-event refuses to click there — the document element is where a real
    // browser lands the click anyway. Radix attaches its document listener on a
    // `setTimeout(…, 0)` once the layer mounts, so let that land first.
    const pointerDownOutside = async () => {
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      });

      fireEvent.pointerDown(document.documentElement);
    };

    it('closes the Location select, then the dialog, on successive outside clicks', async () => {
      const { user } = setupFolderRow();

      await openMoveDialog(user);
      await user.click(await screen.findByRole('combobox'));

      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);

      // A pointerdown inside the listbox used to leave Radix's "the pointer is
      // inside my layer" flag stuck, so the next outside click was swallowed.
      fireEvent.pointerDown(options[0]);
      await pointerDownOutside();

      await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(0));
      expect(screen.getByText('Move elements to')).toBeInTheDocument();

      await pointerDownOutside();

      await waitFor(() => expect(screen.queryByText('Move elements to')).not.toBeInTheDocument());
      expect(mockNavigateToFolder).not.toHaveBeenCalled();
    });

    it('closes the Location select on Escape', async () => {
      const { user } = setupFolderRow();

      await openMoveDialog(user);
      await user.click(await screen.findByRole('combobox'));
      expect(screen.getAllByRole('option').length).toBeGreaterThan(0);

      await user.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(0));
      expect(screen.getByText('Move elements to')).toBeInTheDocument();
    });

    it('does not navigate into the folder when the open dialog is clicked', async () => {
      const { user } = setupFolderRow();

      await openMoveDialog(user);
      await user.click(screen.getByText('Location'));

      expect(mockNavigateToFolder).not.toHaveBeenCalled();
    });
  });

  describe('Selection', () => {
    it('hides all selection checkboxes and the select-all header without assets.update', async () => {
      render(
        <>
          <AssetsTable
            assets={mockAssets}
            folders={[createMockFolder(1, 'Photos')]}
            onAssetItemClick={mockOnAssetItemClick}
          />
          <BulkActionsBar />
        </>,
        {
          renderOptions: { wrapper: AssetSelectionProvider },
          providerOptions: {
            permissions: (defaults: Array<{ action: string }>) =>
              defaults.filter((permission) => permission.action !== 'plugin::upload.assets.update'),
          },
        }
      );

      // Rows still render; only the selection affordance is gone.
      expect(await screen.findByText('image1.png')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      });
      expect(screen.queryByRole('checkbox', { name: 'Select all' })).not.toBeInTheDocument();
    });

    it('renders a selection checkbox on each asset row', async () => {
      setup();

      expect(
        await screen.findByRole('checkbox', { name: 'Select image1.png' })
      ).toBeInTheDocument();
      expect(
        await screen.findByRole('checkbox', { name: 'Select image2.png' })
      ).toBeInTheDocument();
      expect(
        await screen.findByRole('checkbox', { name: 'Select image3.png' })
      ).toBeInTheDocument();
    });

    it('toggles folder selection via the folder checkbox and counts it in the bar', async () => {
      const { user } = setup({ folders: [createMockFolder(1, 'Photos')], assets: mockAssets });

      const folderCheckbox = await screen.findByRole('checkbox', { name: 'Select Photos' });
      expect(folderCheckbox).toBeEnabled();

      await user.click(folderCheckbox);

      expect(folderCheckbox).toBeChecked();
      expect(screen.getByText('1 item selected')).toBeInTheDocument();

      await user.click(folderCheckbox);
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
    });

    it('opens the asset details when its row body is clicked (no selection)', async () => {
      const { user } = setup();

      // rows[0] is the header; rows[1] is the first asset row (image1.png).
      const firstAssetRow = screen.getAllByRole('row')[1];
      await user.click(firstAssetRow);

      expect(mockOnAssetItemClick).toHaveBeenCalledWith(1);
      expect(await screen.findByRole('checkbox', { name: 'Select image1.png' })).not.toBeChecked();
    });

    it('opens details (and does not select) when the filename is clicked', async () => {
      const { user } = setup();

      await user.click(screen.getByText('image1.png'));

      expect(mockOnAssetItemClick).toHaveBeenCalledWith(1);
      expect(await screen.findByRole('checkbox', { name: 'Select image1.png' })).not.toBeChecked();
    });

    it('toggles selection via the row checkbox without opening details', async () => {
      const { user } = setup();

      await user.click(await screen.findByRole('checkbox', { name: 'Select image2.png' }));

      expect(await screen.findByRole('checkbox', { name: 'Select image2.png' })).toBeChecked();
      expect(mockOnAssetItemClick).not.toHaveBeenCalled();

      await user.click(await screen.findByRole('checkbox', { name: 'Select image2.png' }));
      expect(await screen.findByRole('checkbox', { name: 'Select image2.png' })).not.toBeChecked();
    });

    it('selects folders and assets via the header checkbox and shows indeterminate when partial', async () => {
      const { user } = setup({ folders: [createMockFolder(1, 'Photos')], assets: mockAssets });

      const selectAll = await screen.findByRole('checkbox', { name: 'Select all' });

      await user.click(selectAll);

      expect(await screen.findByRole('checkbox', { name: 'Select Photos' })).toBeChecked();
      expect(await screen.findByRole('checkbox', { name: 'Select image1.png' })).toBeChecked();
      expect(await screen.findByRole('checkbox', { name: 'Select image2.png' })).toBeChecked();
      expect(await screen.findByRole('checkbox', { name: 'Select image3.png' })).toBeChecked();
      expect(screen.getByText('4 items selected')).toBeInTheDocument();

      // Unchecking one item leaves the header checkbox in the indeterminate state.
      await user.click(await screen.findByRole('checkbox', { name: 'Select image2.png' }));
      expect(selectAll).toHaveAttribute('data-state', 'indeterminate');
    });

    it('stays indeterminate while a manually checked folder is not part of a full selection', async () => {
      const { user } = setup({ folders: [createMockFolder(1, 'Photos')], assets: mockAssets });

      // Selecting every asset but not the folder must not report "all selected".
      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(await screen.findByRole('checkbox', { name: 'Select image2.png' }));
      await user.click(await screen.findByRole('checkbox', { name: 'Select image3.png' }));

      expect(await screen.findByRole('checkbox', { name: 'Select all' })).toHaveAttribute(
        'data-state',
        'indeterminate'
      );
    });

    it('clears the selection from the header checkbox when all are selected', async () => {
      const { user } = setup({ folders: [createMockFolder(1, 'Photos')], assets: mockAssets });

      const selectAll = await screen.findByRole('checkbox', { name: 'Select all' });

      await user.click(selectAll);
      expect(screen.getByText('4 items selected')).toBeInTheDocument();

      await user.click(selectAll);
      expect(screen.queryByText(/items? selected/)).not.toBeInTheDocument();
      expect(await screen.findByRole('checkbox', { name: 'Select Photos' })).not.toBeChecked();
    });

    it('selects a contiguous range across folders and assets with Shift+click', async () => {
      const { user } = setup({ folders: [createMockFolder(1, 'Photos')], assets: mockAssets });

      // Anchor on the folder, then Shift+click the second asset: the folder and
      // the first two assets end up selected.
      await user.click(await screen.findByRole('checkbox', { name: 'Select Photos' }));
      await user.keyboard('{Shift>}');
      await user.click(await screen.findByRole('checkbox', { name: 'Select image2.png' }));
      await user.keyboard('{/Shift}');

      expect(await screen.findByRole('checkbox', { name: 'Select Photos' })).toBeChecked();
      expect(await screen.findByRole('checkbox', { name: 'Select image1.png' })).toBeChecked();
      expect(await screen.findByRole('checkbox', { name: 'Select image2.png' })).toBeChecked();
      expect(await screen.findByRole('checkbox', { name: 'Select image3.png' })).not.toBeChecked();
      expect(screen.getByText('3 items selected')).toBeInTheDocument();
    });
  });

  describe('BulkActionsBar', () => {
    it('is hidden when nothing is selected', () => {
      setup();

      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
    });

    it('shows the singular count and clears the selection on close', async () => {
      const { user } = setup();

      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));

      const bar = screen.getByRole('region', { name: 'Bulk actions' });
      expect(bar).toBeInTheDocument();
      expect(screen.getByText('1 item selected')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Clear selection' }));

      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
      expect(await screen.findByRole('checkbox', { name: 'Select image1.png' })).not.toBeChecked();
    });

    it('renders the bulk action buttons when assets are selected', async () => {
      const { user } = setup();

      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));

      expect(screen.getByRole('button', { name: 'Create metadata' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument();
    });

    it('generates metadata for the selected assets, toasts, and clears the selection', async () => {
      let requestBody: unknown;
      server.use(
        http.post(
          '*/upload/unstable/generate-ai-metadata',
          async ({ request }) => {
            requestBody = await request.json();
            return HttpResponse.json({
              data: [
                { id: 1, status: 'success' },
                { id: 2, status: 'success' },
              ],
            });
          },
          { once: true }
        )
      );

      const { user } = setup();

      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(await screen.findByRole('checkbox', { name: 'Select image2.png' }));
      await user.click(screen.getByRole('button', { name: 'Create metadata' }));

      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'success',
          message: 'Metadata generated for 2 assets',
        })
      );
      expect(requestBody).toEqual({ fileIds: [1, 2] });
      // Selection cleared → bar gone.
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
    });

    it('summarises a partial metadata result in a warning toast', async () => {
      server.use(
        http.post(
          '*/upload/unstable/generate-ai-metadata',
          () =>
            HttpResponse.json({
              data: [
                { id: 1, status: 'success' },
                { id: 2, status: 'skipped' },
                { id: 3, status: 'error', error: 'AI server unavailable' },
              ],
            }),
          { once: true }
        )
      );

      const { user } = setup();

      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(await screen.findByRole('checkbox', { name: 'Select image2.png' }));
      await user.click(await screen.findByRole('checkbox', { name: 'Select image3.png' }));
      await user.click(screen.getByRole('button', { name: 'Create metadata' }));

      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'warning',
          message: '1 generated, 1 skipped (unsupported file type), 1 failed',
        })
      );
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
    });

    it('disables the action when no selected asset is a supported image', async () => {
      const { user } = setup({
        assets: [createMockAsset(1, 'doc.pdf', 'application/pdf', '.pdf')],
      });

      await user.click(await screen.findByRole('checkbox', { name: 'Select doc.pdf' }));

      // The server would only ever report this back as fully skipped, so the
      // request is never worth sending.
      expect(screen.getByRole('button', { name: 'Create metadata' })).toBeDisabled();
    });

    it('keeps the action enabled when the selection mixes supported and unsupported files', async () => {
      const { user } = setup({
        assets: [
          createMockAsset(1, 'image1.png'),
          createMockAsset(2, 'doc.pdf', 'application/pdf', '.pdf'),
        ],
      });

      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(await screen.findByRole('checkbox', { name: 'Select doc.pdf' }));

      expect(screen.getByRole('button', { name: 'Create metadata' })).toBeEnabled();
    });

    it('reports folders in the selection as ignored rather than silently dropping them', async () => {
      server.use(
        http.post(
          '*/upload/unstable/generate-ai-metadata',
          () => HttpResponse.json({ data: [{ id: 1, status: 'success' }] }),
          { once: true }
        )
      );

      const { user } = setup({ folders: [createMockFolder(1, 'Photos')], assets: mockAssets });

      await user.click(await screen.findByRole('checkbox', { name: 'Select Photos' }));
      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(screen.getByRole('button', { name: 'Create metadata' }));

      // Everything sent succeeded, but the folder was never eligible — warn
      // rather than reporting a clean success the user did not get.
      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'warning',
          message: '1 generated, 0 skipped (unsupported file type), 0 failed, 1 folder ignored',
        })
      );
    });

    it('keeps the selection and shows an error toast when metadata generation fails', async () => {
      server.use(
        http.post(
          '*/upload/unstable/generate-ai-metadata',
          () =>
            HttpResponse.json(
              { error: { message: 'AI Metadata service is not enabled' } },
              { status: 400 }
            ),
          { once: true }
        )
      );

      const { user } = setup();

      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(screen.getByRole('button', { name: 'Create metadata' }));

      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred while generating metadata.',
        })
      );
      expect(await screen.findByRole('checkbox', { name: 'Select image1.png' })).toBeChecked();
      expect(screen.getByRole('region', { name: 'Bulk actions' })).toBeInTheDocument();
    });

    it('keeps the selection and shows an error toast when every file fails server-side', async () => {
      server.use(
        http.post(
          '*/upload/unstable/generate-ai-metadata',
          () =>
            HttpResponse.json({
              data: [
                { id: 1, status: 'error', error: 'AI server unavailable' },
                { id: 2, status: 'error', error: 'AI server unavailable' },
              ],
            }),
          { once: true }
        )
      );

      const { user } = setup();

      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(await screen.findByRole('checkbox', { name: 'Select image2.png' }));
      await user.click(screen.getByRole('button', { name: 'Create metadata' }));

      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred while generating metadata.',
        })
      );
      // A 200 where nothing was written must not clear the selection.
      expect(await screen.findByRole('checkbox', { name: 'Select image1.png' })).toBeChecked();
      expect(screen.getByRole('region', { name: 'Bulk actions' })).toBeInTheDocument();
    });

    it('opens the move dialog when Move is clicked and cancels without moving', async () => {
      const { user } = setup();

      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(screen.getByRole('button', { name: 'Move' }));

      expect(await screen.findByText('Move elements to')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByText('Move elements to')).not.toBeInTheDocument();
      // Selection untouched, nothing sent.
      expect(await screen.findByRole('checkbox', { name: 'Select image1.png' })).toBeChecked();
      expect(mockToggleNotification).not.toHaveBeenCalled();
    });

    it('moves the selection to the picked folder, toasts, and clears the selection', async () => {
      let requestBody: unknown;
      server.use(
        http.get(
          '*/upload/folder-structure',
          () =>
            HttpResponse.json({
              data: [
                { id: 1, name: 'Marketing team', children: [] },
                { id: 2, name: 'Tech', children: [{ id: 3, name: 'Logos', children: [] }] },
              ],
            }),
          { once: true }
        ),
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

      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(await screen.findByRole('checkbox', { name: 'Select image2.png' }));
      await user.click(screen.getByRole('button', { name: 'Move' }));

      // Pick the destination folder in the Location select (defaults to the root).
      // Nested folders show their full ancestry so same-named folders stay
      // distinguishable.
      await user.click(await screen.findByRole('combobox'));
      expect(await screen.findByRole('option', { name: 'Tech / Logos' })).toBeInTheDocument();
      await user.click(screen.getByRole('option', { name: 'Marketing team' }));
      await user.click(screen.getByRole('button', { name: 'Move' }));

      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'success',
          message: '2 elements have been moved from Media Library to Marketing team',
        })
      );
      expect(requestBody).toEqual({ fileIds: [1, 2], folderIds: [], destinationFolderId: 1 });
      // Selection cleared → bar gone, dialog closed.
      expect(screen.queryByText('Move elements to')).not.toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
    });

    it('keeps the move dialog open, keeps the selection, and surfaces the server message on a failed bulk move', async () => {
      server.use(
        http.post(
          '*/upload/actions/bulk-move',
          () =>
            HttpResponse.json(
              { error: { message: 'folders cannot be moved inside themselves' } },
              { status: 400 }
            ),
          { once: true }
        )
      );

      const { user } = setup();

      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(screen.getByRole('button', { name: 'Move' }));

      // Move to the root (default destination) — the request itself fails. The
      // bar's Move icon is aria-hidden behind the modal, so the role query only
      // matches the modal's submit button.
      expect(await screen.findByText('Move elements to')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Move' }));

      // The actionable server message is shown, not the generic fallback.
      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'danger',
          message: 'folders cannot be moved inside themselves',
        })
      );
      // Modal stays open for a retry or Cancel.
      expect(screen.getByText('Move elements to')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      // Selection kept for retry.
      expect(screen.getByRole('region', { name: 'Bulk actions' })).toBeInTheDocument();
      expect(await screen.findByRole('checkbox', { name: 'Select image1.png' })).toBeChecked();
    });

    it('opens a confirm dialog when Delete is clicked and cancels without deleting', async () => {
      const { user } = setup();

      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      expect(await screen.findByText('Delete 1 item?')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByText('Delete 1 item?')).not.toBeInTheDocument();
      // Selection untouched, nothing sent.
      expect(await screen.findByRole('checkbox', { name: 'Select image1.png' })).toBeChecked();
      expect(mockToggleNotification).not.toHaveBeenCalled();
    });

    it('deletes the selected assets on confirm, toasts, and clears the selection', async () => {
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

      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(await screen.findByRole('checkbox', { name: 'Select image2.png' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Confirm' }));

      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'success',
          message: '2 items have been deleted',
        })
      );
      expect(requestBody).toEqual({ fileIds: [1, 2], folderIds: [] });
      // Selection cleared → bar gone.
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
    });

    it('keeps the dialog open and the selection on a failed bulk delete', async () => {
      server.use(
        http.post(
          '*/upload/actions/bulk-delete',
          () => HttpResponse.json({ error: { message: 'boom' } }, { status: 500 }),
          { once: true }
        )
      );

      const { user } = setup();

      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Confirm' }));

      await waitFor(() =>
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred while deleting the items.',
        })
      );
      // Dialog stays open for a direct retry (Confirm again) or Cancel. While
      // the modal is open the page behind it is aria-hidden, so the bar can
      // only be asserted after closing.
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      // Selection kept for retry.
      expect(screen.getByRole('region', { name: 'Bulk actions' })).toBeInTheDocument();
      expect(await screen.findByRole('checkbox', { name: 'Select image1.png' })).toBeChecked();
    });

    it('hides Create metadata when AI metadata is unavailable', async () => {
      mockUseAIAvailability.mockReturnValue({ status: 'success', isEnabled: false });

      const { user } = setup();

      await user.click(await screen.findByRole('checkbox', { name: 'Select image1.png' }));

      expect(screen.queryByRole('button', { name: 'Create metadata' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
  });
});
