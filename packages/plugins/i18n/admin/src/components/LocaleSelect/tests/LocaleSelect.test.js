import React from 'react';

import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render as renderTL, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';

import LocaleSelect from '..';
import reducers from '../../../hooks/reducers';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
}));

jest.mock('../../../hooks/useLocales', () =>
  jest.fn().mockReturnValue({
    locales: [
      {
        code: 'en',
        name: 'English (en)',
        id: 2,
        isDefault: true,
      },
    ],
  })
);

jest.mock('../../../hooks/useDefaultLocales', () =>
  jest.fn().mockReturnValue({
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
  })
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const store = configureStore({
  reducer: combineReducers(reducers),
});

const render = (props) => ({
  user: userEvent.setup(),
  ...renderTL(
    <QueryClientProvider client={queryClient}>
      <IntlProvider messages={{}} locale="en">
        <Provider store={store}>
          <ThemeProvider theme={lightTheme}>
            <LocaleSelect {...props} />
          </ThemeProvider>
        </Provider>
      </IntlProvider>
    </QueryClientProvider>
  ),
});

describe('LocaleSelect', () => {
  it('shows an aria-busy element when loading the data', async () => {
    const { container } = render();

    expect(container.firstChild).toMatchSnapshot();
  });

  it('only shows the locales that have not already been used', async () => {
    const { queryByText, getByRole, user } = render();

    await waitFor(() =>
      expect(queryByText('Loading the available locales...')).not.toBeInTheDocument()
    );
    await user.click(getByRole('combobox'));

    expect(getByRole('option', { name: 'Afrikaans (af)' })).toBeVisible();
    expect(getByRole('option', { name: 'French (fr)' })).toBeVisible();
  });

  it('brings back an object of code and displayName keys when changing', async () => {
    const onLocaleChangeSpy = jest.fn();
    const { queryByText, user, getByRole } = render({ onLocaleChange: onLocaleChangeSpy });

    await waitFor(() =>
      expect(queryByText('Loading the available locales...')).not.toBeInTheDocument()
    );

    await user.click(getByRole('combobox'));
    await user.click(getByRole('option', { name: 'French (fr)' }));

    expect(onLocaleChangeSpy).toBeCalledWith({ code: 'fr', displayName: 'French (fr)' });
  });
});
