export const useDefaultLocales = jest.fn().mockReturnValue({
  defaultLocales: [
    {
      code: 'af',
      name: 'Afrikaans (af)',
    },
    {
      code: 'en',
      name: 'English (en)',
    },
    {
      code: 'fr',
      name: 'French (fr)',
    },
  ],

  isLoading: false,
});
