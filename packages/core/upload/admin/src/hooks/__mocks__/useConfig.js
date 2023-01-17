export const useConfig = jest.fn().mockReturnValue({
  config: {
    isLoading: false,
    isError: false,
    data: {
      pageSize: 10,
    },
    error: '',
  },
  mutateConfig: {
    mutateAsync: jest.fn(),
  },
});
