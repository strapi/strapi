import { userEvent } from '@testing-library/user-event';
import { render, screen, waitFor, server } from '@tests/utils';
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
  useFolderDraggableDroppable: () => ({
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
      <BulkActionsBar />
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

    it('shows empty state when no folders and no assets', () => {
      setup({ folders: [], assets: [] });
      expect(screen.getByText('No content found')).toBeInTheDocument();
    });

    it('renders only folder rows when there are no assets', () => {
      const folders = [createMockFolder(1, 'Photos')];
      setup({ folders, assets: [] });

      expect(screen.getByText('Photos')).toBeInTheDocument();
      expect(screen.queryByText('No content found')).not.toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('renders a selection checkbox on each asset row', () => {
      setup();

      expect(screen.getByRole('checkbox', { name: 'Select image1.png' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Select image2.png' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Select image3.png' })).toBeInTheDocument();
    });

    it('toggles folder selection via the folder checkbox and counts it in the bar', async () => {
      const { user } = setup({ folders: [createMockFolder(1, 'Photos')], assets: mockAssets });

      const folderCheckbox = screen.getByRole('checkbox', { name: 'Select Photos' });
      expect(folderCheckbox).toBeEnabled();

      await user.click(folderCheckbox);

      expect(folderCheckbox).toBeChecked();
      expect(screen.getByText('1 item selected')).toBeInTheDocument();

      await user.click(folderCheckbox);
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
    });

    it('selects an asset when its row body is clicked', async () => {
      const { user } = setup();

      // rows[0] is the header; rows[1] is the first asset row (image1.png).
      const firstAssetRow = screen.getAllByRole('row')[1];
      await user.click(firstAssetRow);

      expect(screen.getByRole('checkbox', { name: 'Select image1.png' })).toBeChecked();
      expect(screen.getByText('1 item selected')).toBeInTheDocument();
    });

    it('opens details (and does not select) when the filename is clicked', async () => {
      const { user } = setup();

      await user.click(screen.getByText('image1.png'));

      expect(mockOnAssetItemClick).toHaveBeenCalledWith(1);
      expect(screen.getByRole('checkbox', { name: 'Select image1.png' })).not.toBeChecked();
    });

    it('toggles selection via the row checkbox without opening details', async () => {
      const { user } = setup();

      await user.click(screen.getByRole('checkbox', { name: 'Select image2.png' }));

      expect(screen.getByRole('checkbox', { name: 'Select image2.png' })).toBeChecked();
      expect(mockOnAssetItemClick).not.toHaveBeenCalled();

      await user.click(screen.getByRole('checkbox', { name: 'Select image2.png' }));
      expect(screen.getByRole('checkbox', { name: 'Select image2.png' })).not.toBeChecked();
    });

    it('selects folders and assets via the header checkbox and shows indeterminate when partial', async () => {
      const { user } = setup({ folders: [createMockFolder(1, 'Photos')], assets: mockAssets });

      const selectAll = screen.getByRole('checkbox', { name: 'Select all' });

      await user.click(selectAll);

      expect(screen.getByRole('checkbox', { name: 'Select Photos' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Select image1.png' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Select image2.png' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Select image3.png' })).toBeChecked();
      expect(screen.getByText('4 items selected')).toBeInTheDocument();

      // Unchecking one item leaves the header checkbox in the indeterminate state.
      await user.click(screen.getByRole('checkbox', { name: 'Select image2.png' }));
      expect(selectAll).toHaveAttribute('data-state', 'indeterminate');
    });

    it('stays indeterminate while a manually checked folder is not part of a full selection', async () => {
      const { user } = setup({ folders: [createMockFolder(1, 'Photos')], assets: mockAssets });

      // Selecting every asset but not the folder must not report "all selected".
      await user.click(screen.getByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select image2.png' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select image3.png' }));

      expect(screen.getByRole('checkbox', { name: 'Select all' })).toHaveAttribute(
        'data-state',
        'indeterminate'
      );
    });

    it('clears the selection from the header checkbox when all are selected', async () => {
      const { user } = setup({ folders: [createMockFolder(1, 'Photos')], assets: mockAssets });

      const selectAll = screen.getByRole('checkbox', { name: 'Select all' });

      await user.click(selectAll);
      expect(screen.getByText('4 items selected')).toBeInTheDocument();

      await user.click(selectAll);
      expect(screen.queryByText(/items? selected/)).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Select Photos' })).not.toBeChecked();
    });

    it('selects a contiguous range across folders and assets with Shift+click', async () => {
      const { user } = setup({ folders: [createMockFolder(1, 'Photos')], assets: mockAssets });

      // Anchor on the folder, then Shift+click the second asset: the folder and
      // the first two assets end up selected.
      await user.click(screen.getByRole('checkbox', { name: 'Select Photos' }));
      await user.keyboard('{Shift>}');
      await user.click(screen.getByRole('checkbox', { name: 'Select image2.png' }));
      await user.keyboard('{/Shift}');

      expect(screen.getByRole('checkbox', { name: 'Select Photos' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Select image1.png' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Select image2.png' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Select image3.png' })).not.toBeChecked();
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

      await user.click(screen.getByRole('checkbox', { name: 'Select image1.png' }));

      const bar = screen.getByRole('region', { name: 'Bulk actions' });
      expect(bar).toBeInTheDocument();
      expect(screen.getByText('1 item selected')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Clear selection' }));

      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Select image1.png' })).not.toBeChecked();
    });

    it('renders stub action buttons when assets are selected', async () => {
      const { user } = setup();

      await user.click(screen.getByRole('checkbox', { name: 'Select image1.png' }));

      expect(screen.getByRole('button', { name: 'Create metadata' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument();
    });

    it('shows an info toast when Create metadata is clicked', async () => {
      const { user } = setup();

      await user.click(screen.getByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(screen.getByRole('button', { name: 'Create metadata' }));

      expect(mockToggleNotification).toHaveBeenCalledWith({
        type: 'info',
        message: "Generate metadata isn't available yet",
      });
    });

    it('shows an info toast when Move is clicked', async () => {
      const { user } = setup();

      await user.click(screen.getByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(screen.getByRole('button', { name: 'Move' }));

      expect(mockToggleNotification).toHaveBeenCalledWith({
        type: 'info',
        message: "Bulk move isn't available yet",
      });
    });

    it('opens a confirm dialog when Delete is clicked and cancels without deleting', async () => {
      const { user } = setup();

      await user.click(screen.getByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      expect(await screen.findByText('Delete 1 item?')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByText('Delete 1 item?')).not.toBeInTheDocument();
      // Selection untouched, nothing sent.
      expect(screen.getByRole('checkbox', { name: 'Select image1.png' })).toBeChecked();
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

      await user.click(screen.getByRole('checkbox', { name: 'Select image1.png' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select image2.png' }));
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

      await user.click(screen.getByRole('checkbox', { name: 'Select image1.png' }));
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
      expect(screen.getByRole('checkbox', { name: 'Select image1.png' })).toBeChecked();
    });

    it('hides Create metadata when AI metadata is unavailable', async () => {
      mockUseAIAvailability.mockReturnValue({ status: 'success', isEnabled: false });

      const { user } = setup();

      await user.click(screen.getByRole('checkbox', { name: 'Select image1.png' }));

      expect(screen.queryByRole('button', { name: 'Create metadata' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
  });
});
