import { useQueryParams } from '@strapi/admin/strapi-admin';
import { render, screen, waitFor } from '@tests/utils';

import { AssetSelectionProvider, useAssetSelection } from '../../hooks/useAssetSelection';
import { BulkActionsBar } from '../BulkActionsBar';

import type { File } from '../../../../../../../shared/contracts/files';
import type { Folder } from '../../../../../../../shared/contracts/folders';

const mockToggleNotification = jest.fn();
const mockAIAvailability = jest.fn(() => false);
const mockTrackUsage = jest.fn();
let mockAiMetadataEnabled = false;

jest.mock('../../../../hooks/useAIMetadataEnabled', () => ({
  ...jest.requireActual('../../../../hooks/useAIMetadataEnabled'),
  useAIMetadataEnabled: () => mockAiMetadataEnabled,
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useNotification: () => ({ toggleNotification: mockToggleNotification }),
}));

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin/ee'),
  useAIAvailability: () => mockAIAvailability(),
}));

jest.mock('../../../../hooks/useTracking', () => ({
  ...jest.requireActual('../../../../hooks/useTracking'),
  useTracking: () => ({ trackUsage: mockTrackUsage }),
}));

jest.mock('../../hooks/useFolderNavigation', () => ({
  useFolderNavigation: () => ({ currentFolderId: null }),
}));

const mockAssets: File[] = [
  { id: 1, name: 'image1.png', mime: 'image/png', ext: '.png', url: '/image1.png' } as File,
  { id: 2, name: 'image2.png', mime: 'image/png', ext: '.png', url: '/image2.png' } as File,
];

/**
 * Drives the real `AssetSelectionProvider` and the real URL query params, so
 * "the selection survives" is genuinely asserted rather than faked by a
 * static mock.
 */
const mockFolders = [{ id: 9, name: 'reports' }] as Folder[];

const Harness = ({ folders = [] as Folder[] }: { folders?: Folder[] }) => {
  const { toggle } = useAssetSelection();
  const [, setQuery] = useQueryParams<{ assetId?: string }>();

  return (
    <>
      <button onClick={() => toggle('asset:1')}>Toggle asset 1</button>
      <button onClick={() => toggle('asset:2')}>Toggle asset 2</button>
      <button onClick={() => setQuery({ assetId: '1' }, 'push', true)}>Open drawer</button>
      <button onClick={() => setQuery({ assetId: undefined }, 'remove', true)}>Close drawer</button>
      <button onClick={() => toggle('folder:9')}>Toggle folder 9</button>
      <BulkActionsBar assets={mockAssets} folders={folders} />
    </>
  );
};

const setup = (initialEntries?: string[], folders?: Folder[]) =>
  render(
    <AssetSelectionProvider>
      <Harness folders={folders} />
    </AssetSelectionProvider>,
    { initialEntries }
  );

describe('BulkActionsBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAiMetadataEnabled = false;
  });

  it('is visible with a selection and no details param', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));
    await user.click(screen.getByRole('button', { name: 'Toggle asset 2' }));

    expect(await screen.findByRole('region', { name: 'Bulk actions' })).toBeInTheDocument();
    expect(screen.getByText('2 items selected')).toBeInTheDocument();
  });

  // jsdom matches no breakpoint, so the base (mobile) rules are what applies here.
  it('is hidden on mobile while the details drawer is open', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));
    await user.click(screen.getByRole('button', { name: 'Toggle asset 2' }));
    await screen.findByRole('region', { name: 'Bulk actions' });

    await user.click(screen.getByRole('button', { name: 'Open drawer' }));

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument()
    );
  });

  // jsdom matches no breakpoint, so these read the mobile rules.
  describe('mobile layout with the metadata action', () => {
    const openBar = async () => {
      const { user } = setup();

      await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));
      await user.click(screen.getByRole('button', { name: 'Toggle asset 2' }));

      return screen.findByRole('region', { name: 'Bulk actions' });
    };

    it('drops the buttons to their own line when Create metadata is offered', async () => {
      mockAiMetadataEnabled = true;

      const bar = await openBar();

      // The labelled button plus the icons no longer fit beside the count, so
      // the count takes a full row and the buttons wrap under it, spread across it.
      const style = window.getComputedStyle(bar);

      expect(style.flexWrap).toBe('wrap');
      expect(style.justifyContent).toBe('space-between');
    });

    it('keeps everything on one line without it', async () => {
      const bar = await openBar();

      const style = window.getComputedStyle(bar);

      expect(style.flexWrap).not.toBe('wrap');
      expect(style.justifyContent).not.toBe('space-between');
    });
  });

  it('returns with the selection intact once the drawer closes', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));
    await user.click(screen.getByRole('button', { name: 'Toggle asset 2' }));
    await screen.findByRole('region', { name: 'Bulk actions' });

    await user.click(screen.getByRole('button', { name: 'Open drawer' }));
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: 'Close drawer' }));

    expect(await screen.findByRole('region', { name: 'Bulk actions' })).toBeInTheDocument();
    expect(screen.getByText('2 items selected')).toBeInTheDocument();
  });

  // Covers deep links and reloads, which take a different path from the case
  // above: the param is already in the URL on mount rather than added later.
  // Selecting after render (rather than asserting on an empty selection)
  // proves the bar is hidden because the drawer is open, not merely because
  // nothing is selected yet.
  it('stays hidden from the first render when the URL already carries the param', async () => {
    const { user } = setup(['/?assetId=1']);

    await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));

    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
  });

  it('does not hide the bar for an unparseable param', async () => {
    const { user } = setup(['/?assetId=abc']);

    await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));

    expect(await screen.findByRole('region', { name: 'Bulk actions' })).toBeInTheDocument();
  });

  describe('select all', () => {
    it('selects every rendered item, folders included', async () => {
      const { user } = setup(undefined, mockFolders);

      await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));
      await user.click(await screen.findByRole('button', { name: 'Select all' }));

      // 2 assets + 1 folder
      expect(await screen.findByText('3 items selected')).toBeInTheDocument();
    });

    it('keeps reading Select all once everything is selected', async () => {
      const { user } = setup(undefined, mockFolders);

      await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));
      await user.click(await screen.findByRole('button', { name: 'Select all' }));

      expect(await screen.findByText('3 items selected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select all' })).toBeInTheDocument();
    });

    it('lets the clear button deselect a select-all selection', async () => {
      const { user } = setup(undefined, mockFolders);

      await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));
      await user.click(await screen.findByRole('button', { name: 'Select all' }));
      expect(await screen.findByText('3 items selected')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Clear selection' }));

      await waitFor(() =>
        expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument()
      );
    });

    it('tracks the select-all action', async () => {
      const { user } = setup(undefined, mockFolders);

      await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));
      expect(mockTrackUsage).not.toHaveBeenCalled();

      await user.click(await screen.findByRole('button', { name: 'Select all' }));

      expect(mockTrackUsage).toHaveBeenCalledWith('didSelectAllMediaLibraryElements');
    });
  });
});
