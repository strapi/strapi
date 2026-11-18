export const useBulkRemove = jest.fn().mockReturnValue({
  isLoading: false,
  error: null,
  remove: jest.fn(),
});
