import { renderHook } from '@tests/utils';

import { useTracking, MEDIA_LIBRARY_VERSION } from '../useTracking';

const mockTrackStrapiUsage = jest.fn();
const mockUseAIAvailability = jest.fn();
const mockUseGetSettingsQuery = jest.fn();

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useTracking: () => ({ trackUsage: mockTrackStrapiUsage }),
}));

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin/ee'),
  useAIAvailability: () => mockUseAIAvailability(),
}));

jest.mock('../../services/settings', () => ({
  useGetUploadSettingsQuery: () => mockUseGetSettingsQuery(),
}));

describe('future media library useTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAIAvailability.mockReturnValue(false);
    mockUseGetSettingsQuery.mockReturnValue({ data: { data: { aiMetadata: false } } });
  });

  it('stamps mediaLibraryVersion on every event and forwards name + properties', () => {
    const { result } = renderHook(() => useTracking());

    result.current.trackUsage('didCropFile', { location: 'upload', duplicatedFile: false });

    expect(mockTrackStrapiUsage).toHaveBeenCalledWith('didCropFile', {
      location: 'upload',
      duplicatedFile: false,
      mediaLibraryVersion: MEDIA_LIBRARY_VERSION,
    });
  });

  it('still stamps the version on events fired without properties', () => {
    const { result } = renderHook(() => useTracking());

    result.current.trackUsage('didSelectAllMediaLibraryElements');

    expect(mockTrackStrapiUsage).toHaveBeenCalledWith('didSelectAllMediaLibraryElements', {
      mediaLibraryVersion: MEDIA_LIBRARY_VERSION,
    });
  });

  it('adds isAiMediaLibraryConfigured when AI is available (mirrors the legacy wrapper)', () => {
    mockUseAIAvailability.mockReturnValue(true);
    mockUseGetSettingsQuery.mockReturnValue({ data: { data: { aiMetadata: true } } });

    const { result } = renderHook(() => useTracking());

    result.current.trackUsage('didReplaceMedia', { location: 'upload' });

    expect(mockTrackStrapiUsage).toHaveBeenCalledWith('didReplaceMedia', {
      location: 'upload',
      isAiMediaLibraryConfigured: true,
      mediaLibraryVersion: MEDIA_LIBRARY_VERSION,
    });
  });

  it('omits isAiMediaLibraryConfigured when AI is unavailable', () => {
    const { result } = renderHook(() => useTracking());

    result.current.trackUsage('didReplaceMedia', { location: 'upload' });

    expect(mockTrackStrapiUsage).toHaveBeenCalledWith(
      'didReplaceMedia',
      expect.not.objectContaining({ isAiMediaLibraryConfigured: expect.anything() })
    );
  });
});
