import { renderHook } from '@tests/utils';

jest.mock('../useMediaLibraryPermissions');
jest.mock('../useSettings');
jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  useAIAvailability: jest.fn(),
}));

import { useAIAvailability } from '../useAiAvailability';

const mockUseGlobalAIAvailability = jest.requireMock('@strapi/admin/strapi-admin/ee')
  .useAIAvailability as jest.Mock;
const mockUseMediaLibraryPermissions = jest.requireMock('../useMediaLibraryPermissions')
  .useMediaLibraryPermissions as jest.Mock;
const mockUseSettings = jest.requireMock('../useSettings').useSettings as jest.Mock;

describe('useAIAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGlobalAIAvailability.mockReturnValue(true);
    mockUseMediaLibraryPermissions.mockReturnValue({ canSettings: true });
    mockUseSettings.mockReturnValue({
      status: 'success',
      data: { aiMetadata: true },
    });
  });

  test('does not fetch settings when AI is not globally available', () => {
    mockUseGlobalAIAvailability.mockReturnValue(false);

    const { result } = renderHook(() => useAIAvailability());

    expect(mockUseSettings).toHaveBeenCalledWith(false);
    expect(result.current).toEqual({ status: 'success', isEnabled: false });
  });

  test('does not fetch settings when the user cannot access media library settings', () => {
    mockUseMediaLibraryPermissions.mockReturnValue({ canSettings: false });

    const { result } = renderHook(() => useAIAvailability());

    expect(mockUseSettings).toHaveBeenCalledWith(false);
    expect(result.current).toEqual({ status: 'success', isEnabled: false });
  });

  test('uses the upload settings when the user can read them', () => {
    const { result } = renderHook(() => useAIAvailability());

    expect(mockUseSettings).toHaveBeenCalledWith(true);
    expect(result.current).toEqual({ status: 'success', isEnabled: true });
  });
});
