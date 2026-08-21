import { useQueryParams } from '@strapi/admin/strapi-admin';
import { render, screen, waitFor } from '@tests/utils';

import { AssetSelectionProvider, useAssetSelection } from '../../hooks/useAssetSelection';
import { BulkActionsBar } from '../BulkActionsBar';

import type { File } from '../../../../../../../shared/contracts/files';

const mockToggleNotification = jest.fn();
const mockAIAvailability = jest.fn(() => false);

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useNotification: () => ({ toggleNotification: mockToggleNotification }),
}));

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin/ee'),
  useAIAvailability: () => mockAIAvailability(),
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
const Harness = () => {
  const { toggle } = useAssetSelection();
  const [, setQuery] = useQueryParams<{ assetId?: string }>();

  return (
    <>
      <button onClick={() => toggle('asset:1')}>Toggle asset 1</button>
      <button onClick={() => toggle('asset:2')}>Toggle asset 2</button>
      <button onClick={() => setQuery({ assetId: '1' }, 'push', true)}>Open drawer</button>
      <button onClick={() => setQuery({ assetId: undefined }, 'remove', true)}>Close drawer</button>
      <BulkActionsBar assets={mockAssets} />
    </>
  );
};

const setup = (initialEntries?: string[]) =>
  render(
    <AssetSelectionProvider>
      <Harness />
    </AssetSelectionProvider>,
    { initialEntries }
  );

describe('BulkActionsBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is visible with a selection and no details param', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));
    await user.click(screen.getByRole('button', { name: 'Toggle asset 2' }));

    expect(await screen.findByRole('region', { name: 'Bulk actions' })).toBeInTheDocument();
    expect(screen.getByText('2 items selected')).toBeInTheDocument();
  });

  it('is hidden while the details drawer is open', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Toggle asset 1' }));
    await user.click(screen.getByRole('button', { name: 'Toggle asset 2' }));
    await screen.findByRole('region', { name: 'Bulk actions' });

    await user.click(screen.getByRole('button', { name: 'Open drawer' }));

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument()
    );
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
});
