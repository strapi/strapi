export const useSettings = jest.fn().mockReturnValue({
  isLoading: false,
  isError: false,
  data: {
    sizeOptimization: true,
    responsiveDimensions: true,
    autoOrientation: true,
    aiMetadata: true,
  },
  error: null,
});
