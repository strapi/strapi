export const useAPIErrorHandler = jest.fn().mockReturnValue({
  formatAPIError: jest.fn,
});

export default useAPIErrorHandler;
