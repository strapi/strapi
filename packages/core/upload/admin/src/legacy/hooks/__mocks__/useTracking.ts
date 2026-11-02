export const MEDIA_LIBRARY_VERSION = 'v1';

export const useTracking = jest.fn().mockReturnValue({
  trackUsage: jest.fn(),
});
