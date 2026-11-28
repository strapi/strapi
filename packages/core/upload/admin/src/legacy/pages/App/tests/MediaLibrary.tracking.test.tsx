import { userEvent } from '@testing-library/user-event';
import { render, screen } from '@tests/utils';

import { useTracking } from '../../../hooks/useTracking';
import { MediaLibrary } from '../MediaLibrary';

jest.mock('../../../ai/components/AIUploadModal', () => ({
  AIUploadModal: () => null,
}));

jest.mock('../../../components/EditAssetDialog/EditAssetContent', () => ({
  EditAssetDialog: () => null,
}));

jest.mock('../../../components/EditFolderDialog/EditFolderDialog', () => ({
  EditFolderDialog: () => null,
}));

jest.mock('../../../components/UploadAssetDialog/UploadAssetDialog', () => ({
  UploadAssetDialog: () => null,
}));

jest.mock('../../../components/AssetGridList/AssetGridList', () => ({
  AssetGridList: () => null,
}));

jest.mock('../../../hooks/useMediaLibraryPermissions', () => ({
  useMediaLibraryPermissions: () => ({
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canCopyLink: true,
    canDownload: true,
    canConfigureView: true,
    isLoading: false,
  }),
}));

jest.mock('../../../hooks/useAIMetadataEnabled', () => ({
  useAIMetadataEnabled: () => ({ isEnabled: false, status: 'success' }),
}));

jest.mock('../../../hooks/useAssets', () => ({
  useAssets: () => ({
    data: {
      results: [
        {
          id: 1,
          name: 'photo.png',
          url: '/uploads/photo.png',
          mime: 'image/png',
          ext: '.png',
          size: 1,
          width: 10,
          height: 10,
        },
      ],
      pagination: { page: 1, pageSize: 10, pageCount: 1, total: 1 },
    },
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../../../hooks/useFolders', () => ({
  useFolders: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../../../hooks/useFolder', () => ({
  useFolder: () => ({
    data: undefined,
    isLoading: false,
    error: null,
  }),
}));

// The setup file replaces this module with a shared jest mock. Read that
// mock instead of calling the hook from the test body.
const mockedUseTracking = useTracking as unknown as jest.Mock;

const getTrackUsage = (): jest.Mock => {
  const returned = mockedUseTracking.mock.results.find((result) => result.type === 'return');

  return (returned?.value.trackUsage ?? mockedUseTracking().trackUsage) as jest.Mock;
};

describe('MediaLibrary tracking', () => {
  beforeEach(() => {
    getTrackUsage().mockClear();
  });

  it('sends sort and select-all through the legacy tracker so they carry mediaLibraryVersion', async () => {
    const user = userEvent.setup();
    render(<MediaLibrary />);

    await user.click(await screen.findByRole('checkbox', { name: 'Select all folders & assets' }));

    expect(getTrackUsage()).toHaveBeenCalledWith('didSelectAllMediaLibraryElements');

    await user.click(screen.getByRole('combobox', { name: 'Sort by' }));
    await user.click(await screen.findByRole('option', { name: 'createdAt:ASC' }));

    expect(getTrackUsage()).toHaveBeenCalledWith('didSortMediaLibraryElements', {
      location: 'upload',
      sort: 'createdAt:ASC',
    });
  });
});
