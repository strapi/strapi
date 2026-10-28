import { renderHook } from '@tests/utils';

// The test setup mocks this module for every other suite, since most components
// only need `trackUsage` to be a spy. Here the real implementation is the thing
// under test.
jest.unmock('../useTracking');

// eslint-disable-next-line import/first
import { useTracking } from '../useTracking';

const mockTrackStrapiUsage = jest.fn();
const mockUseSettings = jest.fn();

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useTracking: () => ({ trackUsage: mockTrackStrapiUsage }),
}));

jest.mock('../useSettings', () => ({
  useSettings: () => mockUseSettings(),
}));

describe('legacy media library useTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSettings.mockReturnValue({
      data: { aiMetadata: false, aiMetadataAvailable: false },
    });
    window.strapi.featureFlags.isEnabled = jest.fn(() => true);
  });

  it('stamps mediaLibraryVersion on every event and forwards name + properties', () => {
    const { result } = renderHook(() => useTracking());

    result.current.trackUsage('didCropFile', { location: 'upload', duplicatedFile: false });

    expect(mockTrackStrapiUsage).toHaveBeenCalledWith('didCropFile', {
      location: 'upload',
      duplicatedFile: false,
      mediaLibraryVersion: 'v1',
    });
  });

  it('still stamps the version on events fired without properties', () => {
    const { result } = renderHook(() => useTracking());

    result.current.trackUsage('didSelectAllMediaLibraryElements');

    expect(mockTrackStrapiUsage).toHaveBeenCalledWith('didSelectAllMediaLibraryElements', {
      mediaLibraryVersion: 'v1',
    });
  });

  it('keeps isAiMediaLibraryConfigured alongside the version', () => {
    mockUseSettings.mockReturnValue({
      data: { aiMetadata: true, aiMetadataAvailable: true },
    });

    const { result } = renderHook(() => useTracking());

    result.current.trackUsage('didReplaceMedia', { location: 'upload' });

    expect(mockTrackStrapiUsage).toHaveBeenCalledWith('didReplaceMedia', {
      location: 'upload',
      isAiMediaLibraryConfigured: true,
      mediaLibraryVersion: 'v1',
    });
  });

  /**
   * The Content Manager media field and its picker are legacy code registered
   * outside the flag's branch, so they run even when a project uses the current
   * library. Tagging by tree would report those projects as legacy holdouts —
   * which is the opposite of what this property is for.
   */
  it('reports v2 when the project has not opted back out, even though this is the legacy tree', () => {
    window.strapi.featureFlags.isEnabled = jest.fn(() => false);

    const { result } = renderHook(() => useTracking());

    result.current.trackUsage('didSelectFile', { location: 'content-manager' });

    expect(mockTrackStrapiUsage).toHaveBeenCalledWith('didSelectFile', {
      location: 'content-manager',
      mediaLibraryVersion: 'v2',
    });
  });
});
