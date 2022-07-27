export const useFolders = jest.fn().mockReturnValue({
  data: [
    {
      id: 1,
      name: 'Folder 1',
      children: {
        count: 1,
      },
      createdAt: '',
      files: {
        count: 1,
      },
      path: '/1',
      pathId: '1',
      updatedAt: '',
    },
  ],
  isLoading: false,
  error: null,
});
