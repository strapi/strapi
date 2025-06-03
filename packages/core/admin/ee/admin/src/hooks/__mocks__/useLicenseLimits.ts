export const useLicenseLimits = jest.fn().mockReturnValue({
  isError: false,
  isLoading: false,
  license: {},
  getFeature() {
    return {};
  },
});
