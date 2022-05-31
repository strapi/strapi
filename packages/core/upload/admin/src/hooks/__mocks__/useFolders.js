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
      path: '/folder-1',
      uid: 'folder-1',
      updatedAt: '',
    },
  ],
  isLoading: false,
  error: null,
});
