import { ThemeProvider, lightTheme } from '@strapi/parts';
import { IntlProvider } from 'react-intl';

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
      <IntlProvider messages={{ en: {} }} textComponent="span" locale="en">
        <main>
          <Story />
        </main>
      </IntlProvider>
    </ThemeProvider>
  ),
];
