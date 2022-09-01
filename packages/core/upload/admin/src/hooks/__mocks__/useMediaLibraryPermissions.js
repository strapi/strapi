export const useMediaLibraryPermissions = jest.fn().mockReturnValue({
  isLoading: false,
  canRead: true,
  canCreate: true,
  canUpdate: true,
  canCopyLink: true,
  canDownload: true,
});
