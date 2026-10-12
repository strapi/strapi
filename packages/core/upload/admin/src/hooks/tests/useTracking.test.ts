import { renderHook } from '@tests/utils';

import { useTracking } from '../useTracking';

const mockTrackStrapiUsage = jest.fn();
const mockUseGetSettingsQuery = jest.fn();

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useTracking: () => ({ trackUsage: mockTrackStrapiUsage }),
}));

jest.mock('../../services/settings', () => ({
  useGetUploadSettingsQuery: () => mockUseGetSettingsQuery(),
}));

describe('future media library useTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The flag decides the tag, not which tree fired the event — off means the
    // project runs the current library.
    window.strapi.featureFlags.isEnabled = jest.fn(() => false);
    mockUseGetSettingsQuery.mockReturnValue({
      data: { data: { aiMetadata: false, aiMetadataAvailable: false } },
    });
  });

  it('stamps mediaLibraryVersion on every event and forwards name + properties', () => {
    const { result } = renderHook(() => useTracking());

    result.current.trackUsage('didCropFile', { location: 'upload', duplicatedFile: false });

    expect(mockTrackStrapiUsage).toHaveBeenCalledWith('didCropFile', {
      location: 'upload',
      duplicatedFile: false,
      mediaLibraryVersion: 'v2',
    });
  });

  it('still stamps the version on events fired without properties', () => {
    const { result } = renderHook(() => useTracking());

    result.current.trackUsage('didSelectAllMediaLibraryElements');

    expect(mockTrackStrapiUsage).toHaveBeenCalledWith('didSelectAllMediaLibraryElements', {
      mediaLibraryVersion: 'v2',
    });
  });

  it('adds isAiMediaLibraryConfigured when a provider is registered (mirrors the legacy wrapper)', () => {
    mockUseGetSettingsQuery.mockReturnValue({
      data: { data: { aiMetadata: true, aiMetadataAvailable: true } },
    });

    const { result } = renderHook(() => useTracking());

    result.current.trackUsage('didReplaceMedia', { location: 'upload' });

    expect(mockTrackStrapiUsage).toHaveBeenCalledWith('didReplaceMedia', {
      location: 'upload',
      isAiMediaLibraryConfigured: true,
      mediaLibraryVersion: 'v2',
    });
  });

  it('omits isAiMediaLibraryConfigured when no provider is registered', () => {
    const { result } = renderHook(() => useTracking());

    result.current.trackUsage('didReplaceMedia', { location: 'upload' });

    expect(mockTrackStrapiUsage).toHaveBeenCalledWith(
      'didReplaceMedia',
      expect.not.objectContaining({ isAiMediaLibraryConfigured: expect.anything() })
    );
  });

  it('picks up aiMetadata after the settings query the tracker reads is refreshed', () => {
    mockUseGetSettingsQuery.mockReturnValue({
      data: { data: { aiMetadata: false, aiMetadataAvailable: true } },
    });

    const { result, rerender } = renderHook(() => useTracking());

    result.current.trackUsage('didGenerateMetadataRetroactively');

    expect(mockTrackStrapiUsage).toHaveBeenCalledWith('didGenerateMetadataRetroactively', {
      isAiMediaLibraryConfigured: false,
      mediaLibraryVersion: 'v2',
    });

    mockUseGetSettingsQuery.mockReturnValue({
      data: { data: { aiMetadata: true, aiMetadataAvailable: true } },
    });
    rerender();

    result.current.trackUsage('didGenerateMetadataRetroactively');

    expect(mockTrackStrapiUsage).toHaveBeenLastCalledWith('didGenerateMetadataRetroactively', {
      isAiMediaLibraryConfigured: true,
      mediaLibraryVersion: 'v2',
    });
  });
});
