import { useQueryParams } from '@strapi/admin/strapi-admin';
import { render, screen, waitFor } from '@tests/utils';

import { AssetSelectionProvider, useAssetSelection } from '../../hooks/useAssetSelection';
import { type ItemKey } from '../../utils/selection';
import { BulkActionsBar } from '../BulkActionsBar';

import type { File } from '../../../../../../../shared/contracts/files';

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

let mockIsGeneratingMetadata = false;

jest.mock('../../../../services/assets', () => ({
  ...jest.requireActual('../../../../services/assets'),
  useGenerateAiMetadataMutation: () => [jest.fn(), { isLoading: mockIsGeneratingMetadata }],
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
/**
 * What the view says is on screen. Passed in rather than derived from the asset
 * and folder lists, mirroring the real wiring: in mixed mode not every folder is
 * rendered, so only the view can say.
 */
const renderedWithFolder: ItemKey[] = ['folder:9', 'asset:1', 'asset:2'];

const Harness = ({ renderedKeys }: { renderedKeys?: ItemKey[] }) => {
  const { toggle } = useAssetSelection();
  const [, setQuery] = useQueryParams<{ assetId?: string }>();

  return (
    <>
      <button onClick={() => toggle('asset:1')}>Toggle asset 1</button>
      <button onClick={() => toggle('asset:2')}>Toggle asset 2</button>
      <button onClick={() => setQuery({ assetId: '1' }, 'push', true)}>Open drawer</button>
      <button onClick={() => setQuery({ assetId: undefined }, 'remove', true)}>Close drawer</button>
      <button onClick={() => toggle('folder:9')}>Toggle folder 9</button>
      <BulkActionsBar assets={mockAssets} renderedKeys={renderedKeys} />
    </>
  );
};

const setup = (initialEntries?: string[], renderedKeys?: ItemKey[]) =>
  render(
    <AssetSelectionProvider>
      <Harness renderedKeys={renderedKeys} />
    </AssetSelectionProvider>,
    { initialEntries }
  );

describe('BulkActionsBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAiMetadataEnabled = false;
    mockIsGeneratingMetadata = false;
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

  describe('space reserved at the end of the list', () => {
    // Restored individually: `jest.restoreAllMocks()` would also drop the
    // `window.matchMedia` mock the shared test setup installs, which every
    // later test in this file needs.
    let rectSpy: jest.SpyInstance | undefined;

    // jsdom has no layout engine, so the bar's geometry is the one thing that
    // has to be supplied.
    const stubBarGeometry = ({ top, height }: { top: number; height: number }) => {
      rectSpy = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        top,
        height,
        bottom: top + height,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: top,
        toJSON: () => ({}),
      } as DOMRect);
    };

    const selectOne = async () => {
      const { user } = setup();

      await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));
      await screen.findByRole('region', { name: 'Bulk actions' });
    };

    beforeEach(() => {
      window.innerHeight = 768;
    });

    afterEach(() => {
      rectSpy?.mockRestore();
      rectSpy = undefined;
    });

    it('reserves nothing without a selection', () => {
      setup();

      // eslint-disable-next-line testing-library/no-node-access
      expect(document.querySelector('[data-bar-spacer]')).not.toBeInTheDocument();
    });

    it("reserves the bar's height plus the gap it floats above the viewport edge", async () => {
      // 48 tall, sitting 16 clear of the bottom edge — the desktop pill.
      stubBarGeometry({ top: 704, height: 48 });

      await selectOne();

      await waitFor(() =>
        // 64, not 48: reserving only the height would leave the gap uncovered.
        // eslint-disable-next-line testing-library/no-node-access
        expect(document.querySelector('[data-bar-spacer]')).toHaveStyle({ height: '64px' })
      );
    });

    it('reserves nothing while the bar is hidden', async () => {
      // What `display: none` reports — a zero-height rect at the origin, which
      // measured naively would reserve the whole viewport.
      stubBarGeometry({ top: 0, height: 0 });

      await selectOne();

      await waitFor(() =>
        // eslint-disable-next-line testing-library/no-node-access
        expect(document.querySelector('[data-bar-spacer]')).toHaveStyle({ height: '0px' })
      );
    });
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
      const { user } = setup(undefined, renderedWithFolder);

      await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));
      await user.click(await screen.findByRole('button', { name: 'Select all' }));

      // 2 assets + 1 folder
      expect(await screen.findByText('3 items selected')).toBeInTheDocument();
    });

    it('keeps reading Select all once everything is selected', async () => {
      const { user } = setup(undefined, renderedWithFolder);

      await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));
      await user.click(await screen.findByRole('button', { name: 'Select all' }));

      expect(await screen.findByText('3 items selected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select all' })).toBeInTheDocument();
    });

    it('lets the clear button deselect a select-all selection', async () => {
      const { user } = setup(undefined, renderedWithFolder);

      await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));
      await user.click(await screen.findByRole('button', { name: 'Select all' }));
      expect(await screen.findByText('3 items selected')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Clear selection' }));

      await waitFor(() =>
        expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument()
      );
    });

    it('is disabled while the bar is busy', async () => {
      mockIsGeneratingMetadata = true;
      const { user } = setup(undefined, renderedWithFolder);

      await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));

      expect(await screen.findByRole('button', { name: 'Select all' })).toBeDisabled();
    });

    it('tracks the select-all action', async () => {
      const { user } = setup(undefined, renderedWithFolder);

      await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));
      expect(mockTrackUsage).not.toHaveBeenCalled();

      await user.click(await screen.findByRole('button', { name: 'Select all' }));

      expect(mockTrackUsage).toHaveBeenCalledWith('didSelectAllMediaLibraryElements');
    });
  });
});
