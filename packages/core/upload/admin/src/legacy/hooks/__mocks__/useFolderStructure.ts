export const useFolderStructure = jest.fn().mockReturnValue({
  isLoading: false,
  error: null,
  data: [
    {
      value: null,
      label: 'Media Library',
      children: [
        {
          value: 1,
          label: 'first child',
          children: [],
        },

        {
          value: 2,
          label: 'second child',
          children: [
            {
              value: 21,
              name: 'first child of the second child',
              children: [
                {
                  value: 22,
                  name: 'another child',
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
