export const useEditFolder = jest.fn().mockReturnValue({
  editFolder: jest.fn().mockResolvedValue({}),
  isLoading: false,
});
