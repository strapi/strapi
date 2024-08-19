export const useLocales = jest.fn().mockReturnValue({
  locales: [
    {
      code: 'en',
      name: 'English (en)',
      id: 2,
      isDefault: true,
    },
  ],

  isLoading: false,
});
