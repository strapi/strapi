export const useFolders = jest.fn().mockReturnValue({
  data: [
    {
      id: 1,
      name: 'Folder 1',
      children: {
        count: 1,
      },
      createdAt: '2021-10-18T08:04:56.326Z',
      files: {
        count: 1,
      },
      parent: null,
      path: '/1',
      pathId: 1,
      updatedAt: '2021-10-18T08:04:56.326Z',
    },
  ],
  isLoading: false,
  error: null,
});
