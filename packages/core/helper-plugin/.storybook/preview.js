import { ThemeProvider, lightTheme } from '@strapi/parts';

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

export const decorators = [
  Story => (
    <ThemeProvider theme={lightTheme}>
      <main>
        <Story />
      </main>
    </ThemeProvider>
  ),
];
