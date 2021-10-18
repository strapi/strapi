import * as RTL from '@testing-library/react';
import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { NotificationsProvider } from '@strapi/helper-plugin';

const internalQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const render = (
  Component,
  props,
  {
    theme = lightTheme,
    toggleNotification = jest.fn(),
    locale = 'en',
    translations = {},
    container = document.body,
    queryClient = internalQueryClient,
  }
) =>
  RTL.render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <NotificationsProvider toggleNotification={toggleNotification}>
          <IntlProvider locale={locale} messages={translations} defaultLocale={locale}>
            <Component {...props} />
          </IntlProvider>
        </NotificationsProvider>
      </ThemeProvider>
    </QueryClientProvider>,
    { container }
  );

export default { ...RTL, render };
